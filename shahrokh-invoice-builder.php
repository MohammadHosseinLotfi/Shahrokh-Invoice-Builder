<?php
/**
 * Plugin Name: Shahrokh Invoice Builder
 * Description: سازنده فاکتور و پیش‌فاکتور با خروجی چاپی HTML برای شرکت‌های دیجیتال مارکتینگ.
 * Version: 1.0.1
 * Author: Shahrokh
 * Text Domain: shahrokh-invoice-builder
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SIB_VERSION', '1.0.1');
define('SIB_PATH', plugin_dir_path(__FILE__));
define('SIB_URL', plugin_dir_url(__FILE__));

define('SIB_POST_TYPE', 'shahrokh_invoice');

define('SIB_META_CLIENT', '_sib_client');
define('SIB_META_INVOICE', '_sib_invoice');
define('SIB_META_ITEMS', '_sib_items');
define('SIB_META_SUMMARY', '_sib_summary');
define('SIB_META_STATUS', '_sib_status');
define('SIB_META_PUBLIC', '_sib_public');
define('SIB_META_TOTAL', '_sib_total');
define('SIB_META_ISSUE_DATE', '_sib_issue_date');
define('SIB_META_CLIENT_NAME', '_sib_client_name');
define('SIB_META_INVOICE_NUMBER', '_sib_invoice_number');
define('SIB_META_PUBLISH_STATUS', '_sib_publish_status');
define('SIB_META_PAYMENT_STATUS', '_sib_payment_status');

define('SIB_OPTION_SERVICES', 'sib_services');
define('SIB_OPTION_SETTINGS', 'sib_company_settings');

require_once SIB_PATH . 'includes/helpers.php';
require_once SIB_PATH . 'includes/admin-pages.php';
require_once SIB_PATH . 'includes/rest-api.php';
require_once SIB_PATH . 'includes/print-router.php';

add_action('init', 'sib_register_invoice_cpt');
add_action('init', 'sib_register_print_rewrite');
add_filter('query_vars', 'sib_register_query_vars');
add_action('template_redirect', 'sib_handle_print_view');

add_action('admin_menu', 'sib_register_admin_menu');
add_action('admin_enqueue_scripts', 'sib_admin_enqueue_assets');

add_action('rest_api_init', 'sib_register_rest_routes');

register_activation_hook(__FILE__, 'sib_activate_plugin');
register_deactivation_hook(__FILE__, 'sib_deactivate_plugin');

function sib_register_invoice_cpt() {
    $labels = array(
        'name' => 'فاکتورها',
        'singular_name' => 'فاکتور',
    );

    register_post_type(SIB_POST_TYPE, array(
        'labels' => $labels,
        'public' => false,
        'show_ui' => false,
        'show_in_menu' => false,
        'supports' => array('title'),
        'capability_type' => 'post',
        'map_meta_cap' => true,
    ));
}

function sib_activate_plugin() {
    sib_register_invoice_cpt();
    sib_register_print_rewrite();
    flush_rewrite_rules();
}

function sib_deactivate_plugin() {
    flush_rewrite_rules();
}

