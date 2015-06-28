/**
 * Filter the recent changes and watchlist by the score of revisions
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
			'RCScoreFilterThreshold'
		] ),
		enabledOnCurrentPage = showScores && (
				$.inArray( conf.wgCanonicalSpecialPageName, [ 'Watchlist', 'Recentchanges' ] ) !== -1 ||
				conf.wgAction === 'history'
			),
        ids = [],
        changes = {},
		threshold = conf.RCScoreFilterThreshold || 0.7,
		batchSize = 5;
	function processScores( data ) {
		var i, score;
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
			if ( score < threshold ) {
				continue;
			}
			changes[ ids[i] ].css(
				'background',
				'hsla(15, 100%, ' +
					( 50 * (score - 1) / (threshold - 1) + 50 ) +
					'%, 1)'
			).attr( 'title', 'Score: ' + ( 100 * score ).toFixed(0) + ' %' );
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
		ids = getRevIdsFromCurrentPage();
		scoreBatch( ids.slice( i, i + batchSize ) );
	}

	if ( enabledOnCurrentPage ) {
		mw.hook( 'wikipage.content' ).add( load );
	}

}( mediaWiki, jQuery ) );
