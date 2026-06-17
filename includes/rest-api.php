<?php

if (!defined('ABSPATH')) {
    exit;
}

function sib_register_rest_routes() {
    register_rest_route('sib/v1', '/invoices', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sib_rest_list_invoices',
            'permission_callback' => 'sib_rest_can_manage',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'sib_rest_create_invoice',
            'permission_callback' => 'sib_rest_can_manage',
        ),
    ));

    register_rest_route('sib/v1', '/invoices/(?P<id>\d+)', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sib_rest_get_invoice',
            'permission_callback' => 'sib_rest_can_manage',
        ),
        array(
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => 'sib_rest_update_invoice',
            'permission_callback' => 'sib_rest_can_manage',
        ),
        array(
            'methods' => WP_REST_Server::DELETABLE,
            'callback' => 'sib_rest_delete_invoice',
            'permission_callback' => 'sib_rest_can_manage',
        ),
    ));

    register_rest_route('sib/v1', '/services', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sib_rest_list_services',
            'permission_callback' => 'sib_rest_can_manage',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'sib_rest_create_service',
            'permission_callback' => 'sib_rest_can_manage',
        ),
    ));

    register_rest_route('sib/v1', '/services/(?P<id>\d+)', array(
        array(
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => 'sib_rest_update_service',
            'permission_callback' => 'sib_rest_can_manage',
        ),
        array(
            'methods' => WP_REST_Server::DELETABLE,
            'callback' => 'sib_rest_delete_service',
            'permission_callback' => 'sib_rest_can_manage',
        ),
    ));

    register_rest_route('sib/v1', '/settings', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sib_rest_get_settings',
            'permission_callback' => 'sib_rest_can_manage',
        ),
        array(
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => 'sib_rest_save_settings',
            'permission_callback' => 'sib_rest_can_manage',
        ),
    ));

    register_rest_route('sib/v1', '/system', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sib_rest_system_status',
            'permission_callback' => 'sib_rest_can_manage',
        ),
    ));
}

function sib_rest_can_manage($request) {
    if (!current_user_can('manage_options')) {
        return new WP_Error('sib_forbidden', 'دسترسی کافی ندارید.', array('status' => 403));
    }

    $nonce = $request->get_header('X-WP-Nonce');
    if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
        return new WP_Error('sib_invalid_nonce', 'نشانه امنیتی نامعتبر است.', array('status' => 403));
    }

    return true;
}

function sib_rest_list_invoices($request) {
    $page = max(1, absint($request['page'] ?? 1));
    $per_page = max(1, min(50, absint($request['per_page'] ?? 10)));
    $search = sanitize_text_field($request['search'] ?? '');
    $payment_status = sanitize_text_field($request['payment_status'] ?? '');
    $publish_status = sanitize_text_field($request['publish_status'] ?? '');
    $date_from = sib_sanitize_jalali_date($request['date_from'] ?? '');
    $date_to = sib_sanitize_jalali_date($request['date_to'] ?? '');
    $order = strtolower(sanitize_text_field($request['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';

    $meta_query = array('relation' => 'AND');

    if (in_array($payment_status, array('unpaid', 'partial', 'paid'), true)) {
        $meta_query[] = array(
            'key' => SIB_META_PAYMENT_STATUS,
            'value' => $payment_status,
            'compare' => '=',
        );
    }

    if (in_array($publish_status, array('draft', 'issued'), true)) {
        $meta_query[] = array(
            'key' => SIB_META_PUBLISH_STATUS,
            'value' => $publish_status,
            'compare' => '=',
        );
    }

    if ($search !== '') {
        $meta_query[] = array(
            'relation' => 'OR',
            array(
                'key' => SIB_META_CLIENT_NAME,
                'value' => $search,
                'compare' => 'LIKE',
            ),
            array(
                'key' => SIB_META_INVOICE_NUMBER,
                'value' => $search,
                'compare' => 'LIKE',
            ),
            array(
                'key' => SIB_META_ISSUE_DATE,
                'value' => $search,
                'compare' => 'LIKE',
            ),
        );
    }

    if ($date_from && $date_to) {
        $meta_query[] = array(
            'key' => SIB_META_ISSUE_DATE,
            'value' => array($date_from, $date_to),
            'compare' => 'BETWEEN',
            'type' => 'CHAR',
        );
    } elseif ($date_from) {
        $meta_query[] = array(
            'key' => SIB_META_ISSUE_DATE,
            'value' => $date_from,
            'compare' => '>=',
            'type' => 'CHAR',
        );
    } elseif ($date_to) {
        $meta_query[] = array(
            'key' => SIB_META_ISSUE_DATE,
            'value' => $date_to,
            'compare' => '<=',
            'type' => 'CHAR',
        );
    }

    $args = array(
        'post_type' => SIB_POST_TYPE,
        'post_status' => 'any',
        'posts_per_page' => $per_page,
        'paged' => $page,
        'orderby' => 'meta_value',
        'meta_key' => SIB_META_ISSUE_DATE,
        'order' => $order,
    );

    if (count($meta_query) > 1) {
        $args['meta_query'] = $meta_query;
    }

    $query = new WP_Query($args);
    $items = array();

    foreach ($query->posts as $post) {
        $invoice = sib_prepare_invoice_response($post->ID);
        $items[] = array(
            'id' => $invoice['id'],
            'invoice_number' => $invoice['invoice']['number'] ?? '',
            'client_name' => $invoice['client']['name'] ?? '',
            'issue_date' => $invoice['invoice']['issue_date_shamsi'] ?? '',
            'total' => $invoice['total'],
            'publish_status' => $invoice['status']['publish_status'] ?? 'draft',
            'payment_status' => $invoice['status']['payment_status'] ?? 'unpaid',
            'print_url' => $invoice['print_url'],
        );
    }

    return rest_ensure_response(array(
        'items' => $items,
        'total' => (int) $query->found_posts,
        'total_pages' => (int) $query->max_num_pages,
    ));
}

function sib_rest_get_invoice($request) {
    $invoice_id = absint($request['id']);
    $post = get_post($invoice_id);
    if (!$post || $post->post_type !== SIB_POST_TYPE) {
        return new WP_Error('sib_not_found', 'فاکتور یافت نشد.', array('status' => 404));
    }

    return rest_ensure_response(sib_prepare_invoice_response($invoice_id));
}

function sib_rest_create_invoice($request) {
    $clean = sib_sanitize_invoice_payload($request->get_json_params(), false);

    $attempts = 0;
    $number = sib_next_invoice_number();
    while (!sib_is_invoice_number_unique($number) && $attempts < 5) {
        $number = sib_next_invoice_number();
        $attempts++;
    }

    if (!sib_is_invoice_number_unique($number)) {
        return new WP_Error('sib_duplicate_number', 'شماره فاکتور تکراری است.', array('status' => 409));
    }

    $clean['invoice']['number'] = $number;

    $post_id = wp_insert_post(array(
        'post_type' => SIB_POST_TYPE,
        'post_status' => 'publish',
        'post_title' => $clean['invoice']['number'] . ' - ' . $clean['client']['name'],
    ), true);

    if (is_wp_error($post_id)) {
        return $post_id;
    }

    $public = array(
        'hash' => sib_generate_public_hash(),
    );
    update_post_meta($post_id, SIB_META_PUBLIC, $public);

    sib_update_invoice_meta($post_id, $clean);

    return rest_ensure_response(sib_prepare_invoice_response($post_id));
}

function sib_rest_update_invoice($request) {
    $invoice_id = absint($request['id']);
    $post = get_post($invoice_id);
    if (!$post || $post->post_type !== SIB_POST_TYPE) {
        return new WP_Error('sib_not_found', 'فاکتور یافت نشد.', array('status' => 404));
    }

    $clean = sib_sanitize_invoice_payload($request->get_json_params(), true);

    $existing_invoice = get_post_meta($invoice_id, SIB_META_INVOICE, true);
    if (!is_array($existing_invoice)) {
        $existing_invoice = array();
    }

    $existing_number = $existing_invoice['number'] ?? '';
    if (empty($clean['invoice']['number'])) {
        $clean['invoice']['number'] = $existing_number ?: sib_next_invoice_number();
    }

    if (
        $clean['invoice']['number'] !== $existing_number
        && !sib_is_invoice_number_unique($clean['invoice']['number'], $invoice_id)
    ) {
        return new WP_Error('sib_duplicate_number', 'شماره فاکتور تکراری است.', array('status' => 409));
    }

    $public = get_post_meta($invoice_id, SIB_META_PUBLIC, true);
    $public = is_array($public) ? $public : array();
    if (empty($public['hash'])) {
        $public['hash'] = sib_generate_public_hash();
        update_post_meta($invoice_id, SIB_META_PUBLIC, $public);
    }

    sib_update_invoice_meta($invoice_id, $clean);

    wp_update_post(array(
        'ID' => $invoice_id,
        'post_title' => $clean['invoice']['number'] . ' - ' . $clean['client']['name'],
    ));

    return rest_ensure_response(sib_prepare_invoice_response($invoice_id));
}

function sib_rest_delete_invoice($request) {
    $invoice_id = absint($request['id']);
    $post = get_post($invoice_id);
    if (!$post || $post->post_type !== SIB_POST_TYPE) {
        return new WP_Error('sib_not_found', 'فاکتور یافت نشد.', array('status' => 404));
    }

    wp_delete_post($invoice_id, true);

    return rest_ensure_response(array('deleted' => true));
}

function sib_sanitize_service_payload($data) {
    $data = is_array($data) ? $data : array();
    return array(
        'title' => sanitize_text_field($data['title'] ?? ''),
        'price' => max(0, sib_sanitize_number($data['price'] ?? 0)),
        'unit' => sanitize_text_field($data['unit'] ?? ''),
        'qty' => max(0, sib_sanitize_number($data['qty'] ?? 1)),
        'desc' => sanitize_text_field($data['desc'] ?? ''),
    );
}

function sib_rest_list_services() {
    return rest_ensure_response(array('items' => array_values(sib_get_services())));
}

function sib_rest_create_service($request) {
    $services = sib_get_services();
    $service = sib_sanitize_service_payload($request->get_json_params());

    do {
        $id = wp_rand(100000, 999999);
    } while (isset($services[$id]));
    $service['id'] = $id;

    $services[$id] = $service;
    update_option(SIB_OPTION_SERVICES, $services, false);

    return rest_ensure_response(array('items' => array_values($services)));
}

function sib_rest_update_service($request) {
    $services = sib_get_services();
    $id = absint($request['id']);
    if (!$id || !isset($services[$id])) {
        return new WP_Error('sib_not_found', 'خدمت یافت نشد.', array('status' => 404));
    }

    $service = sib_sanitize_service_payload($request->get_json_params());
    $service['id'] = $id;
    $services[$id] = $service;

    update_option(SIB_OPTION_SERVICES, $services, false);

    return rest_ensure_response(array('items' => array_values($services)));
}

function sib_rest_delete_service($request) {
    $services = sib_get_services();
    $id = absint($request['id']);
    if (!$id || !isset($services[$id])) {
        return new WP_Error('sib_not_found', 'خدمت یافت نشد.', array('status' => 404));
    }

    unset($services[$id]);
    update_option(SIB_OPTION_SERVICES, $services, false);

    return rest_ensure_response(array('items' => array_values($services)));
}

function sib_rest_get_settings() {
    return rest_ensure_response(sib_get_company_settings());
}

function sib_rest_save_settings($request) {
    $data = $request->get_json_params();
    $data = is_array($data) ? $data : array();

    $logo_id = absint($data['logo_id'] ?? 0);
    $logo_url = '';
    if ($logo_id) {
        $logo_url = wp_get_attachment_url($logo_id);
    } elseif (!empty($data['logo_url'])) {
        $logo_url = esc_url_raw($data['logo_url']);
    }

    $settings = array(
        'company_name' => sanitize_text_field($data['company_name'] ?? ''),
        'phone' => sanitize_text_field($data['phone'] ?? ''),
        'email' => sanitize_email($data['email'] ?? ''),
        'address' => sanitize_textarea_field($data['address'] ?? ''),
        'logo_id' => $logo_id,
        'logo_url' => $logo_url,
        'bank_name' => sanitize_text_field($data['bank_name'] ?? ''),
        'card_number' => sanitize_text_field($data['card_number'] ?? ''),
        'iban' => sanitize_text_field($data['iban'] ?? ''),
        'account_number' => sanitize_text_field($data['account_number'] ?? ''),
        'footer_note' => sanitize_textarea_field($data['footer_note'] ?? ''),
    );

    update_option(SIB_OPTION_SETTINGS, $settings, false);

    return rest_ensure_response($settings);
}

function sib_rest_system_status() {
    $invoice_count = wp_count_posts(SIB_POST_TYPE);
    $services = sib_get_services();

    return rest_ensure_response(array(
        'plugin_version' => SIB_VERSION,
        'wp_version' => get_bloginfo('version'),
        'php_version' => PHP_VERSION,
        'memory_limit' => ini_get('memory_limit'),
        'timezone' => wp_timezone_string(),
        'invoices_total' => isset($invoice_count->publish) ? intval($invoice_count->publish) : 0,
        'services_total' => count($services),
        'site_url' => home_url(),
    ));
}

