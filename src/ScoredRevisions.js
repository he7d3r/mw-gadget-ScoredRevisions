/**
 * Highlight revisions by their scores
 *
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

	var showScores = mw.util.getParamValue( 'showscores' ) !== '0',
		models,
		chosenModels = [ 'damaging', 'reverted' ],
		conf = mw.config.get( [
			'wgIsArticle',
			'wgCurRevisionId',
			'wgCanonicalSpecialPageName',
			'wgDBname',
			'wgAction',
			'ScoredRevisionsThresholds',
			'ScoredRevisionsServerUrl'
		] ),
		serverUrl = conf.ScoredRevisionsServerUrl || '//ores.wmflabs.org/scores/',
		enabledOnCurrentPage = showScores && (
				$.inArray( conf.wgCanonicalSpecialPageName, [
					'Watchlist',
					'Recentchanges',
					'Recentchangeslinked',
					'Contributions'
				] ) !== -1 ||
				conf.wgAction === 'history' ||
				( conf.wgIsArticle && conf.wgAction === 'view' )
			),
        idsOnPage = [],
        changes = {},
		thresholds = conf.ScoredRevisionsThresholds ||
			{
				low: 0.8,
				medium: 0.87,
				high: 0.94
			},
		batchSize = 50;
	function processScores( data ) {
		var i, revid, m, score, scoreData, scoreTitles, classes,
			idsWithScores = Object.keys( data );
		if ( data.error ) {
			mw.log.error( data.error );
			return;
		}
		for ( i = 0; i < idsWithScores.length; i++ ) {
			revid = idsWithScores[i];
			classes = [];
			scoreTitles = [];
			scoreData = data[ revid ];
			for ( m = 0; m < models.length; m++ ) {
				if ( !scoreData || scoreData.error || scoreData[ models[m] ].error ) {
					continue;
				} else {
					score = scoreData[ models[m] ].probability['true'];
				}
				scoreTitles.push( ( 100 * score ).toFixed(0) + '% ' + models[m] );
				// Allow users to customize the style (colors, icons, hide, etc) using classes
				// 'sr-reverted-high', 'sr-reverted-medium', 'sr-reverted-low' and 'sr-reverted-none'
				// 'sr-damaging-high', 'sr-damaging-medium', 'sr-damaging-low' and 'sr-damaging-none'
				classes.push(
					score >= thresholds.high ?
						'sr-' + models[m] + '-high' :
						score >= thresholds.medium ?
							'sr-' + models[m] + '-medium' :
							score >= thresholds.low ?
								'sr-' + models[m] + '-low' :
								'sr-' + models[m] + '-none'
				);
			}
			changes[ revid ]
				.addClass( classes.join( ' ' ) )
				.attr( 'title', 'Scores: ' + scoreTitles.join( '; ' ) );
		}
	}

	function getRevIdsFromCurrentPage() {
		var dfd = $.Deferred(),
			idsFound = {},
			pageids = {},
			isChangesList = conf.wgCanonicalSpecialPageName === 'Watchlist' ||
				conf.wgCanonicalSpecialPageName === 'Recentchanges' ||
				conf.wgCanonicalSpecialPageName === 'Recentchangeslinked',
			// This "usenewrc" can be the string "0" if the user disabled the preference ([[phab:T54542#555387]])
			/*jshint eqeqeq:false*/
			container = isChangesList ?
				'.mw-changeslist' :
				conf.wgCanonicalSpecialPageName === 'Contributions' ?
					'.mw-contributions-list' :
					'#pagehistory',
			rowSelector = mw.user.options.get( 'usenewrc' ) == 1 && isChangesList ?
				'tr' :
				'li',
			linkSelector = conf.wgCanonicalSpecialPageName === 'Contributions' ||
				conf.wgAction === 'history' ?
				'a.mw-changeslist-date' :
				'a';
		if ( conf.wgIsArticle && conf.wgAction === 'view' ) {
			changes[ conf.wgCurRevisionId ] = $( '#ca-history a' );
			return dfd.resolve( [ conf.wgCurRevisionId ] ).promise();
		}
		$( container )
			.find( rowSelector )
			.each( function () {
				var $row = $( this ),
					id, pageid;
				if ( $row.hasClass( 'wikibase-edit' ) ) {
					// Skip external edits from Wikidata
					return false;
				}
				$row.find( linkSelector )
					.each( function () {
						var href = $( this ).attr( 'href' );
						id = mw.util.getParamValue( 'diff', href );
						if ( id === 'prev' || conf.wgCanonicalSpecialPageName === 'Contributions' ||
							conf.wgAction === 'history' ) {
							id = mw.util.getParamValue( 'oldid', href );
						}
						if ( id && /^([1-9]\d*)$/.test( id ) ) {
							// Found a revid, stop
							return false;
						} else if ( !pageid ) {
							pageid = mw.util.getParamValue( 'curid', href );
						}
					} );
				// use id or pageid
				if ( id ) {
					changes[ id ] = $row;
					idsFound[ id ] = true;
				} else if ( pageid ) {
					pageids[ pageid ] = $row;
				}
			} );
		if ( $.isEmptyObject( pageids ) ) {
			dfd.resolve( Object.keys( idsFound ) );
		} else {
			$.getJSON( mw.util.wikiScript( 'api' ), {
				format: 'json',
				action: 'query',
				prop: 'revisions',
				// FIXME: the API does not allow using this with multiple pageids
				// rvdir: 'newer',
				rvprop: 'ids',
				pageids: Object.keys( pageids ).join( '|' )
			} )
			.done( function ( data ) {
				if ( data && data.query && data.query.pages ) {
					$.each( data.query.pages, function ( pageid, page ) {
						var id = page.revisions[0].revid;
						if ( !changes[ id ] ) {
							changes[ id ] = pageids[ pageid ];
							idsFound[ id ] = true;
						}
					} );
				}
			} )
			.always( function () {
				dfd.resolve( Object.keys( idsFound ) );
			} );
		}
		return dfd.promise();
	}

	function getAvailableModels() {
		var dfd = $.Deferred();
		$.ajax( {
			url: serverUrl + conf.wgDBname + '/',
			dataType: 'jsonp'
		} )
		.done( function ( data ) {
			if ( data.error ) {
				mw.log.error( data.error );
				dfd.reject();
				return;
			}
			dfd.resolve( Object.keys( data.models ) || [] );
		} )
		.fail( dfd.reject );
		return dfd.promise();
	}

	function load() {
		var i = 0,
			scoreBatch = function ( idsOnBatch, models ) {
				$.ajax( {
					url: serverUrl + conf.wgDBname + '/',
					data: {
						models: models.join( '|' ),
						revids: idsOnBatch.join( '|' )
					},
					dataType: 'jsonp'
				} )
				.done( function ( data ) {
					processScores( data );
					i += batchSize;
					if ( i < idsOnPage.length ) {
						scoreBatch( idsOnPage.slice( i, i + batchSize ), models );
					}
				} )
				.fail( function () {
					mw.log.error( 'The request failed.', arguments );
				} );
			};
		mw.loader.load( '//meta.wikimedia.org/w/index.php?title=User:He7d3r/Tools/ScoredRevisions.css&action=raw&ctype=text/css', 'text/css' );
		getAvailableModels()
		.done( function ( availableModels ) {
			models = $.map( chosenModels, function ( m ) {
				return $.inArray( m, availableModels ) < 0 ? null : m;
			} );
			if ( models.length === 0 ) {
				mw.log.warn(
					'ORES does not have any of the chosen models (' +
					chosenModels.join( ', ' ) + ') for this wiki.\n' +
					'More information at https://meta.wikimedia.org/wiki/ORES'
				);
			}
			getRevIdsFromCurrentPage()
			.done( function ( idsFromPage ) {
				idsOnPage = idsFromPage;
				if ( idsOnPage.length ) {
					scoreBatch( idsOnPage.slice( i, i + batchSize ), models );
				}
			} );
		} )
		.fail( function ( data ) {
			mw.log.error( data );
		} );
	}

	if ( enabledOnCurrentPage ) {
		mw.hook( 'wikipage.content' ).add( load );
	}

}( mediaWiki, jQuery ) );
