<?php

if (!defined('ABSPATH')) {
    exit;
}

function sib_register_print_rewrite() {
    add_rewrite_rule('^invoice-print/([0-9]+)/([A-Za-z0-9]+)/?$', 'index.php?sib_invoice_print=1&sib_invoice_id=$matches[1]&sib_invoice_hash=$matches[2]', 'top');
}

function sib_register_query_vars($vars) {
    $vars[] = 'sib_invoice_print';
    $vars[] = 'sib_invoice_id';
    $vars[] = 'sib_invoice_hash';
    return $vars;
}

function sib_handle_print_view() {
    if (!get_query_var('sib_invoice_print')) {
        return;
    }

    $invoice_id = absint(get_query_var('sib_invoice_id'));
    $hash = sanitize_text_field(get_query_var('sib_invoice_hash'));

    if (!$invoice_id || $hash === '') {
        status_header(404);
        exit;
    }

    $public = get_post_meta($invoice_id, SIB_META_PUBLIC, true);
    $public = is_array($public) ? $public : array();
    $stored_hash = $public['hash'] ?? '';

    if (!$stored_hash || !hash_equals($stored_hash, $hash)) {
        status_header(404);
        exit;
    }

    $invoice = sib_prepare_invoice_response($invoice_id);

    if (empty($invoice['invoice'])) {
        status_header(404);
        exit;
    }

    $company = sib_get_company_settings();
    $totals = sib_compute_totals($invoice['items'], $invoice['summary']);

    status_header(200);
    nocache_headers();
    header('X-Robots-Tag: noindex, nofollow, noarchive', true);

    require SIB_PATH . 'templates/print-modern.php';
    exit;
}

