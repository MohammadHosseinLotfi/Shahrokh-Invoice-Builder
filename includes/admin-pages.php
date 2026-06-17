<?php

if (!defined('ABSPATH')) {
    exit;
}

function sib_register_admin_menu() {
    $cap = 'manage_options';

    add_menu_page(
        'فاکتورساز',
        'فاکتورساز',
        $cap,
        'sib-invoices',
        'sib_render_invoices_page',
        'dashicons-media-spreadsheet',
        26
    );

    add_submenu_page('sib-invoices', 'مشاهده فاکتورها', 'مشاهده فاکتورها', $cap, 'sib-invoices', 'sib_render_invoices_page');
    add_submenu_page('sib-invoices', 'افزودن فاکتور جدید', 'افزودن فاکتور جدید', $cap, 'sib-invoice-new', 'sib_render_invoice_builder_page');
    add_submenu_page('sib-invoices', 'خدمات', 'خدمات', $cap, 'sib-services', 'sib_render_services_page');
    add_submenu_page('sib-invoices', 'تنظیمات شرکت', 'تنظیمات شرکت', $cap, 'sib-settings', 'sib_render_settings_page');
    add_submenu_page('sib-invoices', 'وضعیت سیستم', 'وضعیت سیستم', $cap, 'sib-status', 'sib_render_status_page');
}

function sib_admin_enqueue_assets($hook) {
    $page = '';
    if (!empty($_GET['page'])) {
        $page = sanitize_text_field(wp_unslash($_GET['page']));
    }

    $is_sib_page = ($page !== '' && strpos($page, 'sib-') === 0);
    if (!$is_sib_page && is_string($hook) && strpos($hook, 'sib-') !== false) {
        $is_sib_page = true;
        if ($page === '' && preg_match('/_page_([a-z0-9\-]+)$/', $hook, $matches)) {
            $page = $matches[1];
        }
    }

    if (!$is_sib_page) {
        return;
    }

    $font_path = SIB_PATH . 'assets/admin-font.css';
    $css_path = SIB_PATH . 'assets/admin-app.css';
    $js_path = SIB_PATH . 'assets/admin-app.js';

    $font_version = file_exists($font_path) ? filemtime($font_path) : SIB_VERSION;
    $css_version = file_exists($css_path) ? filemtime($css_path) : SIB_VERSION;
    $js_version = file_exists($js_path) ? filemtime($js_path) : SIB_VERSION;

    wp_enqueue_style('sib-admin-font', SIB_URL . 'assets/admin-font.css', array(), $font_version);
    wp_enqueue_style('sib-admin-app', SIB_URL . 'assets/admin-app.css', array('sib-admin-font'), $css_version);

    wp_enqueue_script('sib-admin-app', SIB_URL . 'assets/admin-app.js', array(), $js_version, true);
    wp_script_add_data('sib-admin-app', 'charset', 'utf-8');

    if ($page === 'sib-settings') {
        wp_enqueue_media();
    }

    wp_localize_script('sib-admin-app', 'sibAdmin', array(
        'restUrl' => esc_url_raw(rest_url('sib/v1/')),
        'nonce' => wp_create_nonce('wp_rest'),
        'page' => $page,
        'adminBase' => admin_url('admin.php'),
    ));
}

function sib_render_admin_shell($page) {
    $rest_url = esc_url(rest_url('sib/v1/'));
    $nonce = wp_create_nonce('wp_rest');
    $admin_base = esc_url(admin_url('admin.php'));

    echo '<div class="sib-admin" data-page="' . esc_attr($page) . '" data-rest-url="' . esc_attr($rest_url) . '" data-nonce="' . esc_attr($nonce) . '" data-admin-base="' . esc_attr($admin_base) . '"><div id="sib-app"><div class="sib-empty">Loading...</div></div></div>';
}

function sib_render_invoices_page() {
    sib_render_admin_shell('list');
}

function sib_render_invoice_builder_page() {
    sib_render_admin_shell('builder');
}

function sib_render_services_page() {
    sib_render_admin_shell('services');
}

function sib_render_settings_page() {
    sib_render_admin_shell('settings');
}

function sib_render_status_page() {
    sib_render_admin_shell('status');
}

