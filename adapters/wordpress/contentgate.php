<?php
/**
 * Server-side HTTP client example, NOT a WordPress protection plugin.
 * Use only with article bodies stored outside public posts/REST/media endpoints.
 * The publisher must obtain a short-lived token for the CURRENT verified WP user;
 * ContentGate's authenticate callback must verify that token and its audience.
 */
function contentgate_fetch_article( $content_id, $verified_user_token ) {
    if ( ! is_user_logged_in() || ! is_string( $verified_user_token ) || $verified_user_token === '' ) {
        return new WP_Error( 'contentgate_denied', 'Access unavailable.' );
    }
    if ( ! preg_match( '/\A[A-Za-z0-9][A-Za-z0-9_-]{0,127}\z/', $content_id ) ) {
        return new WP_Error( 'contentgate_invalid', 'Invalid content identifier.' );
    }
    // Define CONTENTGATE_ORIGIN in server configuration, never from request input.
    $response = wp_remote_post( rtrim( CONTENTGATE_ORIGIN, '/' ) . '/v1/content/' . rawurlencode( $content_id ) . '/access', array(
        'headers' => array( 'Authorization' => 'Bearer ' . $verified_user_token ),
        'timeout' => 5,
        'redirection' => 0,
        'sslverify' => true,
    ) );
    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
        return new WP_Error( 'contentgate_denied', 'Access unavailable.' );
    }
    nocache_headers();
    header( 'Cache-Control: private, no-store' );
    $payload = json_decode( wp_remote_retrieve_body( $response ), true );
    return isset( $payload['data'] ) ? $payload['data'] : new WP_Error( 'contentgate_invalid', 'Access unavailable.' );
}
