/**
 * Filter the recent changes and watchlist by the score of revisions
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

    var minScore = mw.util.getParamValue( 'revertedscore' ),
		ids = [],
		$changes = {};

	function processScores( data ){
		var i, score;
		if ( data.error ) {
			console.warn( data.error );
			return;
		}
		for ( i = 0; i < ids.length; i++ ) {
			score = data[ ids[i] ];
			if ( !score || score.reverted.error ) {
				continue;
			} else {
				score = score.reverted.probability.true;
			}
			if ( score > minScore ) {
				$changes[ ids[i] ].css(
					'background',
					'hsla(15, 100%, ' +
						( 50 * data[ ids[i] ].reverted.probability.true ) +
						'%, 1)'
				);
			}
		}
	}

    function load() {
		// This can be the string "0" if the user disabled the preference ([[phab:T54542#555387]])
		/*jshint eqeqeq:false*/
    	$( '.mw-changeslist' )
			.find( mw.user.options.get( 'usenewrc' ) == 1 ? 'tr' : 'li' )
			.each( function() {
				var $row = $( this );
				$row.find( 'a' ).filter( function () {
					var id = mw.util.getParamValue( 'diff', $( this ).attr( 'href' ) );
					if ( id ) {
						$changes[ id ] = $row;
						ids.push( id );
						return true;
					}
					return false;
				} );
			} );
			/*jshint eqeqeq:true*/
		$.ajax( {
			url: '//ores-test.wmflabs.org/scores/' + mw.config.get( 'wgDBname' ),
			data: {
				models: 'reverted',
				revids: ids.slice( 0, 50 ).join( '|' )
			},
			dataType: 'jsonp',
			timeout: 10000
		} )
		.done( processScores )
		.fail( function (){
			console.warn( 'The request failed.', arguments );
		} );
    }

	if ( $.inArray( mw.config.get( 'wgCanonicalSpecialPageName' ), [ 'Watchlist', 'Recentchanges' ] ) !== -1 &&
        minScore
    ) {
		$( load );
	}

}( mediaWiki, jQuery ) );
