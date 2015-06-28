/**
 * Highlight revisions by their scores
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

	var showScores = mw.util.getParamValue( 'showscores' ) !== '0',
		conf = mw.config.get( [
			'wgCanonicalSpecialPageName',
			'wgDBname',
			'wgAction',
			'ScoredRevisionsThresholds'
		] ),
		enabledOnCurrentPage = showScores && (
				$.inArray( conf.wgCanonicalSpecialPageName, [ 'Watchlist', 'Recentchanges' ] ) !== -1 ||
				conf.wgAction === 'history'
			),
        ids = [],
        changes = {},
		thresholds = conf.ScoredRevisionsThresholds || [ 75, 85, 95 ],
		batchSize = 5;
	function processScores( data ) {
		var i, j, score, className;
		if ( data.error ) {
			console.warn( data.error );
			return;
		}
		for ( i = 0; i < ids.length; i++ ) {
			score = data[ ids[i] ];
			if ( !score || score.error || score.reverted.error ) {
				continue;
			} else {
				score = score.reverted.probability['true'];
			}
			// Add classes 'scored-revisions-90', 'scored-revisions-80', ...
			// so that users can customize the style (icons, colors, etc)
			for ( j = thresholds.length-1; j >= 0; j-- ) {
				if ( score * 100 >= thresholds[j] ) {
					className = 'sr-revert-' + thresholds[j];
					changes[ ids[i] ]
						.addClass( className )
						.attr( 'title', 'Revert score: ' + ( 100 * score ).toFixed(0) + ' %' );
					break;
				}
			}
		}
	}

	function getRevIdsFromCurrentPage() {
		var ids = {},
			// This "usenewrc" can be the string "0" if the user disabled the preference ([[phab:T54542#555387]])
			/*jshint eqeqeq:false*/
			container = $.inArray( conf.wgCanonicalSpecialPageName, [ 'Watchlist', 'Recentchanges' ] ) !== -1 ?
				'.mw-changeslist' :
				'#pagehistory',
			rowElement = mw.user.options.get( 'usenewrc' ) != 1 ||
        conf.wgAction === 'history' ?
				'li' :
				'tr';
		$( container )
			.find( rowElement )
			.each( function () {
				var $row = $( this );
				$row.find( 'a' )
					.filter( function () {
						var id = mw.util.getParamValue( 'diff', $( this ).attr( 'href' ) );
						// FIXME: avoid duplicated ids when using "new recent changes"
						// (the first row has a diff for many revs)
						if ( id && /^([1-9]\d*)$/.test( id ) ) {
							changes[ id ] = $row;
							ids[ id ] = true;
							return true;
						}
						return false;
					} );
			} );
		return Object.keys( ids );
	}

	function load() {
		var i = 0,
			scoreBatch = function ( revids ) {
				$.ajax( {
					url: '//ores.wmflabs.org/scores/' + conf.wgDBname + '/',
					data: {
						models: 'reverted',
						revids: revids.join( '|' )
					},
					dataType: 'jsonp'
				} )
				.done( function ( data ) {
					processScores( data );
					i += batchSize;
					if ( i < ids.length ) {
						scoreBatch( ids.slice( i, i + batchSize ) );
					}
				} )
				.fail( function () {
					console.warn( 'The request failed.', arguments );
				} );
			};
		mw.util.addCSS( [
			'#mw-content-text .sr-revert-95 { background: #f4908a; }',
			'#mw-content-text .sr-revert-85 { background: #ffbe99; }',
			'#mw-content-text .sr-revert-75 { background: #ffe099; }',
		].join( '\n' ) );
		ids = getRevIdsFromCurrentPage();
		scoreBatch( ids.slice( i, i + batchSize ) );
	}

	if ( enabledOnCurrentPage ) {
		mw.hook( 'wikipage.content' ).add( load );
	}

}( mediaWiki, jQuery ) );
