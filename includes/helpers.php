<?php

if (!defined('ABSPATH')) {
    exit;
}

function sib_get_company_settings() {
    $defaults = array(
        'company_name' => '',
        'phone' => '',
        'email' => '',
        'address' => '',
        'logo_id' => 0,
        'logo_url' => '',
        'bank_name' => '',
        'card_number' => '',
        'iban' => '',
        'account_number' => '',
        'footer_note' => '',
    );

    $saved = get_option(SIB_OPTION_SETTINGS, array());
    if (!is_array($saved)) {
        $saved = array();
    }

    return array_merge($defaults, $saved);
}

function sib_get_services() {
    $services = get_option(SIB_OPTION_SERVICES, array());
    if (!is_array($services)) {
        return array();
    }
    return $services;
}

function sib_sanitize_jalali_date($value) {
    $value = trim((string) $value);
    if ($value === '') {
        return '';
    }
    $value = preg_replace('/[^0-9\/]/', '', $value);
    if (!preg_match('/^\d{4}\/\d{2}\/\d{2}$/', $value)) {
        return '';
    }
    return $value;
}

function sib_sanitize_phone($value) {
    $value = trim((string) $value);
    return preg_replace('/[^0-9\+\-\s]/', '', $value);
}

function sib_normalize_number($value) {
    if (is_array($value)) {
        return '0';
    }
    $value = trim((string) $value);
    if ($value === '') {
        return '0';
    }

    $value = preg_replace('/[\x{200c}\x{200d}\x{200e}\x{200f}\x{202a}-\x{202e}]/u', '', $value);
    $value = str_replace(array("\u{066C}", ','), '', $value);
    $value = str_replace("\u{066B}", '.', $value);
    $value = strtr($value, array(
        "\u{06F0}" => '0',
        "\u{06F1}" => '1',
        "\u{06F2}" => '2',
        "\u{06F3}" => '3',
        "\u{06F4}" => '4',
        "\u{06F5}" => '5',
        "\u{06F6}" => '6',
        "\u{06F7}" => '7',
        "\u{06F8}" => '8',
        "\u{06F9}" => '9',
    ));
    $value = strtr($value, array(
        "\u{0660}" => '0',
        "\u{0661}" => '1',
        "\u{0662}" => '2',
        "\u{0663}" => '3',
        "\u{0664}" => '4',
        "\u{0665}" => '5',
        "\u{0666}" => '6',
        "\u{0667}" => '7',
        "\u{0668}" => '8',
        "\u{0669}" => '9',
    ));
    $value = preg_replace('/[^0-9.\-]/', '', $value);

    return $value;
}

function sib_sanitize_number($value) {
    return floatval(sib_normalize_number($value));
}

function sib_sanitize_items($items) {
    $clean = array();
    if (!is_array($items)) {
        return $clean;
    }

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $qty = max(0, sib_sanitize_number($item['qty'] ?? 0));
        $price = max(0, sib_sanitize_number($item['price'] ?? 0));
        $disc = max(0, sib_sanitize_number($item['disc'] ?? 0));
        $disc_type = ($item['disc_type'] ?? 'amount') === 'percent' ? 'percent' : 'amount';
        $taxable = !empty($item['taxable']);

        $clean[] = array(
            'title' => sanitize_text_field($item['title'] ?? ''),
            'desc' => sanitize_textarea_field($item['desc'] ?? ''),
            'qty' => $qty,
            'unit' => sanitize_text_field($item['unit'] ?? ''),
            'price' => $price,
            'disc' => $disc,
            'disc_type' => $disc_type,
            'taxable' => $taxable,
        );
    }

    return $clean;
}

function sib_compute_totals($items, $summary) {
    $sub_total = 0;
    $taxable_base = 0;

    foreach ($items as $item) {
        $qty = max(0, sib_sanitize_number($item['qty'] ?? 0));
        $price = max(0, sib_sanitize_number($item['price'] ?? 0));
        $disc = max(0, sib_sanitize_number($item['disc'] ?? 0));
        $disc_type = ($item['disc_type'] ?? 'amount') === 'percent' ? 'percent' : 'amount';

        $line_base = $qty * $price;
        $line_disc = $disc_type === 'percent' ? ($line_base * $disc / 100) : $disc;
        $line_total = max(0, $line_base - $line_disc);

        $sub_total += $line_total;
        if (!empty($item['taxable'])) {
            $taxable_base += $line_total;
        }
    }

    $global_disc = max(0, sib_sanitize_number($summary['global_disc'] ?? 0));
    $global_disc_type = ($summary['global_disc_type'] ?? 'amount') === 'percent' ? 'percent' : 'amount';
    $global_disc_value = $global_disc_type === 'percent' ? ($sub_total * $global_disc / 100) : $global_disc;

    $vat_enabled = !empty($summary['vat_enabled']);
    $vat_percent = max(0, sib_sanitize_number($summary['vat_percent'] ?? 0));
    $vat_total = $vat_enabled ? ($taxable_base * $vat_percent / 100) : 0;

    $extra = max(0, sib_sanitize_number($summary['extra'] ?? 0));

    $total = max(0, $sub_total - $global_disc_value + $vat_total + $extra);

    return array(
        'sub_total' => $sub_total,
        'global_discount' => $global_disc_value,
        'vat_total' => $vat_total,
        'extra' => $extra,
        'total' => $total,
    );
}

function sib_sanitize_invoice_payload($payload, $is_update = false) {
    $payload = is_array($payload) ? $payload : array();

    $client = $payload['client'] ?? array();
    $invoice = $payload['invoice'] ?? array();
    $summary = $payload['summary'] ?? array();
    $status = $payload['status'] ?? array();

    $clean = array(
        'client' => array(
            'name' => sanitize_text_field($client['name'] ?? ''),
            'phone1' => sib_sanitize_phone($client['phone1'] ?? ''),
            'phone2' => sib_sanitize_phone($client['phone2'] ?? ''),
            'email' => sanitize_email($client['email'] ?? ''),
            'address' => sanitize_textarea_field($client['address'] ?? ''),
        ),
        'invoice' => array(
            'number' => sanitize_text_field($invoice['number'] ?? ''),
            'issue_date_shamsi' => sib_sanitize_jalali_date($invoice['issue_date_shamsi'] ?? ''),
            'is_proforma' => !empty($invoice['is_proforma']),
        ),
        'items' => sib_sanitize_items($payload['items'] ?? array()),
        'summary' => array(
            'vat_enabled' => !empty($summary['vat_enabled']),
            'vat_percent' => max(0, min(100, sib_sanitize_number($summary['vat_percent'] ?? 0))),
            'extra' => max(0, sib_sanitize_number($summary['extra'] ?? 0)),
            'global_disc' => max(0, sib_sanitize_number($summary['global_disc'] ?? 0)),
            'global_disc_type' => ($summary['global_disc_type'] ?? 'amount') === 'percent' ? 'percent' : 'amount',
        ),
        'status' => array(
            'publish_status' => ($status['publish_status'] ?? 'draft') === 'issued' ? 'issued' : 'draft',
            'payment_status' => in_array(($status['payment_status'] ?? 'unpaid'), array('unpaid', 'partial', 'paid'), true) ? $status['payment_status'] : 'unpaid',
            'due_date' => sib_sanitize_jalali_date($status['due_date'] ?? ''),
            'paid_at' => sib_sanitize_jalali_date($status['paid_at'] ?? ''),
            'paid_amount' => max(0, sib_sanitize_number($status['paid_amount'] ?? 0)),
            'paid_note' => sanitize_textarea_field($status['paid_note'] ?? ''),
        ),
    );

    if ($clean['invoice']['issue_date_shamsi'] === '') {
        $clean['invoice']['issue_date_shamsi'] = sib_today_jalali();
    }

    if (!$is_update || empty($clean['invoice']['number'])) {
        $clean['invoice']['number'] = '';
    }

    return $clean;
}

function sib_today_jalali() {
    $timestamp = current_time('timestamp');
    $gy = (int) date('Y', $timestamp);
    $gm = (int) date('m', $timestamp);
    $gd = (int) date('d', $timestamp);

    $jalali = sib_gregorian_to_jalali($gy, $gm, $gd);
    return sprintf('%04d/%02d/%02d', $jalali[0], $jalali[1], $jalali[2]);
}

function sib_jalali_year() {
    $timestamp = current_time('timestamp');
    $gy = (int) date('Y', $timestamp);
    $gm = (int) date('m', $timestamp);
    $gd = (int) date('d', $timestamp);

    $jalali = sib_gregorian_to_jalali($gy, $gm, $gd);
    return $jalali[0];
}

function sib_gregorian_to_jalali($gy, $gm, $gd) {
    $g_d_m = array(0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334);
    if ($gy > 1600) {
        $jy = 979;
        $gy -= 1600;
    } else {
        $jy = 0;
        $gy -= 621;
    }

    $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
    $days = (365 * $gy) + intdiv(($gy2 + 3), 4) - intdiv(($gy2 + 99), 100) + intdiv(($gy2 + 399), 400) - 80 + $gd + $g_d_m[$gm - 1];

    $jy += 33 * intdiv($days, 12053);
    $days %= 12053;
    $jy += 4 * intdiv($days, 1461);
    $days %= 1461;

    if ($days > 365) {
        $jy += intdiv(($days - 1), 365);
        $days = ($days - 1) % 365;
    }

    if ($days < 186) {
        $jm = 1 + intdiv($days, 31);
        $jd = 1 + ($days % 31);
    } else {
        $jm = 7 + intdiv(($days - 186), 30);
        $jd = 1 + (($days - 186) % 30);
    }

    return array($jy, $jm, $jd);
}

function sib_next_invoice_number() {
    global $wpdb;
    $year = sib_jalali_year();
    $option_name = 'sib_invoice_seq_' . $year;

    $wpdb->query(
        $wpdb->prepare(
            "INSERT INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no') ON DUPLICATE KEY UPDATE option_value = option_value + 1",
            $option_name,
            1
        )
    );

    $value = $wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $option_name));
    $seq = max(1, intval($value));

    return sprintf('SH-%d-%06d', $year, $seq);
}

function sib_is_invoice_number_unique($number, $exclude_id = 0) {
    $number = sanitize_text_field($number);
    if ($number === '') {
        return true;
    }

    $args = array(
        'post_type' => SIB_POST_TYPE,
        'post_status' => 'any',
        'fields' => 'ids',
        'posts_per_page' => 1,
        'meta_query' => array(
            array(
                'key' => SIB_META_INVOICE_NUMBER,
                'value' => $number,
                'compare' => '=',
            ),
        ),
    );

    if ($exclude_id) {
        $args['post__not_in'] = array($exclude_id);
    }

    $query = new WP_Query($args);
    return empty($query->posts);
}

function sib_generate_public_hash() {
    return wp_generate_password(18, false, false);
}

function sib_build_print_url($invoice_id, $hash) {
    return home_url('/invoice-print/' . $invoice_id . '/' . $hash . '/');
}

function sib_prepare_invoice_response($post_id) {
    $client = get_post_meta($post_id, SIB_META_CLIENT, true);
    $invoice = get_post_meta($post_id, SIB_META_INVOICE, true);
    $items = get_post_meta($post_id, SIB_META_ITEMS, true);
    $summary = get_post_meta($post_id, SIB_META_SUMMARY, true);
    $status = get_post_meta($post_id, SIB_META_STATUS, true);
    $public = get_post_meta($post_id, SIB_META_PUBLIC, true);
    $total = get_post_meta($post_id, SIB_META_TOTAL, true);

    $client = is_array($client) ? $client : array();
    $invoice = is_array($invoice) ? $invoice : array();
    $items = is_array($items) ? $items : array();
    $summary = is_array($summary) ? $summary : array();
    $status = is_array($status) ? $status : array();
    $public = is_array($public) ? $public : array();

    $hash = $public['hash'] ?? '';

    return array(
        'id' => $post_id,
        'client' => $client,
        'invoice' => $invoice,
        'items' => $items,
        'summary' => $summary,
        'status' => $status,
        'total' => floatval($total),
        'print_url' => $hash ? sib_build_print_url($post_id, $hash) : '',
        'public' => array(
            'hash' => $hash,
        ),
    );
}

function sib_update_invoice_meta($post_id, $clean) {
    $summary = $clean['summary'] ?? array();
    $items = $clean['items'] ?? array();
    $totals = sib_compute_totals($items, $summary);

    update_post_meta($post_id, SIB_META_CLIENT, $clean['client']);
    update_post_meta($post_id, SIB_META_INVOICE, $clean['invoice']);
    update_post_meta($post_id, SIB_META_ITEMS, $items);
    update_post_meta($post_id, SIB_META_SUMMARY, $summary);
    update_post_meta($post_id, SIB_META_STATUS, $clean['status']);
    update_post_meta($post_id, SIB_META_TOTAL, $totals['total']);
    update_post_meta($post_id, SIB_META_ISSUE_DATE, $clean['invoice']['issue_date_shamsi']);
    update_post_meta($post_id, SIB_META_CLIENT_NAME, $clean['client']['name']);
    update_post_meta($post_id, SIB_META_INVOICE_NUMBER, $clean['invoice']['number']);
    update_post_meta($post_id, SIB_META_PUBLISH_STATUS, $clean['status']['publish_status']);
    update_post_meta($post_id, SIB_META_PAYMENT_STATUS, $clean['status']['payment_status']);

    return $totals;
}



