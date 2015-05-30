/**
 * Filter the recent changes and watchlist by the score of revisions
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

	var showScores = mw.util.getParamValue( 'showscores' ) !== '0',
        ids = [],
        $changes = {},
		threshold = mw.config.get( 'RCScoreFilterThreshold', 0.7 ),
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
			$changes[ ids[i] ].css(
				'background',
				'hsla(15, 100%, ' +
					( 50 * (score - 1) / (threshold - 1) + 50 ) +
					'%, 1)'
			).attr( 'title', 'Score: ' + ( 100 * score ).toFixed(0) + ' %' );
		}
	}

	function load() {
		var i = 0,
			scoreBatch = function ( revids ) {
				$.ajax( {
					url: '//ores.wmflabs.org/scores/' + mw.config.get( 'wgDBname' ) + '/',
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
		// This can be the string "0" if the user disabled the preference ([[phab:T54542#555387]])
		/*jshint eqeqeq:false*/
		$( '.mw-changeslist' )
			.find( mw.user.options.get( 'usenewrc' ) == 1 ? 'tr' : 'li' )
			.each( function () {
				var $row = $( this );
				$row.find( 'a' ).filter( function () {
					var id = mw.util.getParamValue( 'diff', $( this ).attr( 'href' ) );
					// FIXME: avoid duplicated ids when using "new recent changes"
					// (the first row has a diff for many revs)
					if ( id && /^([1-9]\d*)$/.test( id ) ) {
						$changes[ id ] = $row;
						ids.push( id );
						return true;
					}
					return false;
				} );
			} );
		scoreBatch( ids.slice( i, i + batchSize ) );
	}

	if ( $.inArray( mw.config.get( 'wgCanonicalSpecialPageName' ), [ 'Watchlist', 'Recentchanges' ] ) !== -1 &&
        showScores
	) {
		mw.hook( 'wikipage.content' ).add( load );
	}

}( mediaWiki, jQuery ) );
