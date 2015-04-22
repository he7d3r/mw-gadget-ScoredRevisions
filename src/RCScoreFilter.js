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
		threshold = 0.5;
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
					( 100 * (1 - 0.1 * score ) ) +
					'%, 1)'
			).attr( 'title', 'Score: ' + ( 100 * score ).toFixed(2) + ' %' );
		}
	}

	function load() {
		// This can be the string "0" if the user disabled the preference ([[phab:T54542#555387]])
		/*jshint eqeqeq:false*/
		$( '.mw-changeslist' )
			.find( mw.user.options.get( 'usenewrc' ) == 1 ? 'tr' : 'li' )
			.each( function () {
				var $row = $( this );
				$row.find( 'a' ).filter( function () {
					var id = mw.util.getParamValue( 'diff', $( this ).attr( 'href' ) );
					if ( id && /^([1-9]\d*)$/.test( id ) ) {
						$changes[ id ] = $row;
						ids.push( id );
						return true;
					}
					return false;
				} );
			} );
		/*jshint eqeqeq:true*/
		$.ajax( {
			url: '//ores-test.wmflabs.org/scores/' + mw.config.get( 'wgDBname' ) + '/',
			data: {
				models: 'reverted',
				revids: ids.slice( 0, 50 ).join( '|' )
			},
			dataType: 'jsonp'
		} )
		.done( processScores )
		.fail( function () {
			console.warn( 'The request failed.', arguments );
		} );
	}

	if ( $.inArray( mw.config.get( 'wgCanonicalSpecialPageName' ), [ 'Watchlist', 'Recentchanges' ] ) !== -1 &&
        showScores
	) {
		$( load );
	}

}( mediaWiki, jQuery ) );
