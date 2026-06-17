<?php

if (!defined('ABSPATH')) {
    exit;
}

$company_name = esc_html($company['company_name'] ?? '');
$company_phone = esc_html($company['phone'] ?? '');
$company_email = esc_html($company['email'] ?? '');
$company_address = esc_html($company['address'] ?? '');
$company_logo = esc_url($company['logo_url'] ?? '');

$bank_name = esc_html($company['bank_name'] ?? '');
$card_number = esc_html($company['card_number'] ?? '');
$iban = esc_html($company['iban'] ?? '');
$account_number = esc_html($company['account_number'] ?? '');
$footer_note = esc_html($company['footer_note'] ?? '');

$client = $invoice['client'] ?? array();
$invoice_meta = $invoice['invoice'] ?? array();
$status = $invoice['status'] ?? array();

$invoice_number = esc_html($invoice_meta['number'] ?? '');
$issue_date = esc_html($invoice_meta['issue_date_shamsi'] ?? '');
$is_proforma = !empty($invoice_meta['is_proforma']);

$client_name = esc_html($client['name'] ?? '');
$client_phone1 = esc_html($client['phone1'] ?? '');
$client_phone2 = esc_html($client['phone2'] ?? '');
$client_email = esc_html($client['email'] ?? '');
$client_address = esc_html($client['address'] ?? '');

$publish_status = ($status['publish_status'] ?? 'draft') === 'issued' ? 'صادر شده' : 'پیش‌نویس';
$payment_status_map = array(
    'unpaid' => 'پرداخت نشده',
    'partial' => 'پرداخت جزئی',
    'paid' => 'تسویه شده',
);
$payment_status = $payment_status_map[$status['payment_status'] ?? 'unpaid'] ?? 'پرداخت نشده';
$due_date = esc_html($status['due_date'] ?? '');
$paid_at = esc_html($status['paid_at'] ?? '');
$paid_amount = floatval($status['paid_amount'] ?? 0);
$paid_note = esc_html($status['paid_note'] ?? '');
$show_paid_amount = ($status['payment_status'] ?? 'unpaid') === 'partial';
$currency_label = 'تومان';
$format_currency = function ($value) use ($currency_label) {
    return number_format($value) . ' ' . $currency_label;
};
$net_total = $totals['total'];
if ($show_paid_amount && $paid_amount > 0) {
    $net_total = max(0, $net_total - $paid_amount);
}
$total_label = ($show_paid_amount && $paid_amount > 0) ? 'مبلغ باقی‌مانده' : 'مبلغ نهایی';

$items = is_array($invoice['items']) ? $invoice['items'] : array();
$summary = is_array($invoice['summary'] ?? null) ? $invoice['summary'] : array();
$vat_enabled = !empty($summary['vat_enabled']);
$vat_percent = floatval($summary['vat_percent'] ?? 0);

$show_discount_col = false;
$show_tax_col = false;
foreach ($items as $item) {
    if (floatval($item['disc'] ?? 0) > 0) {
        $show_discount_col = true;
    }
    if ($vat_enabled && $vat_percent > 0 && !empty($item['taxable'])) {
        $show_tax_col = true;
    }
}

$columns = array(
    'title' => 20,
    'desc' => 28,
    'qty' => 8,
    'unit' => 7,
    'price' => 12,
);
if ($show_discount_col) {
    $columns['disc'] = 9;
}
if ($show_tax_col) {
    $columns['tax'] = 7;
}
$columns['total'] = max(8, 100 - array_sum($columns));

?><!doctype html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title><?php echo esc_html($invoice_number); ?></title>
    <link rel="stylesheet" href="<?php echo esc_url(SIB_URL . 'assets/admin-font.css'); ?>" />
    <link rel="stylesheet" href="<?php echo esc_url(SIB_URL . 'assets/print.css'); ?>" />
</head>
<body>
    <div class="sib-print">
        <?php if ($is_proforma) : ?>
            <div class="sib-watermark">پیش‌نویس</div>
        <?php endif; ?>

        <div class="sib-print__actions">
            <button type="button" class="sib-btn" onclick="window.print()">چاپ / ذخیره PDF</button>
        </div>

        <header class="sib-print__header">
            <div class="sib-print__brand">
                <?php if ($company_logo) : ?>
                    <img src="<?php echo $company_logo; ?>" alt="<?php echo $company_name; ?>" class="sib-print__logo" />
                <?php endif; ?>
                <div>
                    <h1><?php echo $company_name !== '' ? $company_name : 'شرکت'; ?></h1>
                    <div class="sib-print__brand-meta">
                        <?php if ($company_phone) : ?><span><?php echo $company_phone; ?></span><?php endif; ?>
                        <?php if ($company_email) : ?><span><?php echo $company_email; ?></span><?php endif; ?>
                    </div>
                    <?php if ($company_address) : ?>
                        <div class="sib-print__address"><?php echo $company_address; ?></div>
                    <?php endif; ?>
                </div>
            </div>
            <div class="sib-print__meta">
                <div><span>شماره فاکتور</span><strong><?php echo $invoice_number; ?></strong></div>
                <div><span>تاریخ صدور</span><strong><?php echo $issue_date; ?></strong></div>
                <div><span>وضعیت صدور</span><strong><?php echo esc_html($publish_status); ?></strong></div>
                <div><span>وضعیت پرداخت</span><strong><?php echo esc_html($payment_status); ?></strong></div>
            </div>
        </header>

        <section class="sib-print__section">
            <h2>اطلاعات مشتری</h2>
            <div class="sib-print__grid">
                <div><span>نام مشتری</span><strong><?php echo $client_name; ?></strong></div>
                <div><span>شماره تماس</span><strong><?php echo $client_phone1; ?></strong></div>
                <div><span>شماره تماس</span><strong><?php echo $client_phone2; ?></strong></div>
                <div><span>ایمیل</span><strong><?php echo $client_email; ?></strong></div>
                <div class="sib-print__full"><span>آدرس</span><strong><?php echo $client_address; ?></strong></div>
            </div>
        </section>

        <section class="sib-print__section">
            <h2>آیتم‌های فاکتور</h2>
            <table class="sib-print__table">
                <colgroup>
                    <col style="width:20%">
                    <col style="width: 40%">
                    <col style="width: 5>%">
                    <col style="width: 5>%">
                    <col style="width: 12%">
                    <?php if ($show_discount_col) : ?>
                        <col style="width: 5>%">
                    <?php endif; ?>
                    <?php if ($show_tax_col) : ?>
                        <col style="width: 5>%">
                    <?php endif; ?>
                    <col style="width: 12%">
                </colgroup>
                <thead>
                    <tr>
                        <th>عنوان</th>
                        <th>توضیح</th>
                        <th>تعداد</th>
                        <th>واحد</th>
                        <th>قیمت</th>
                        <?php if ($show_discount_col) : ?>
                            <th>تخفیف</th>
                        <?php endif; ?>
                        <?php if ($show_tax_col) : ?>
                            <th>مالیات (%)</th>
                        <?php endif; ?>
                        <th>جمع</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($items as $item) :
                    $title = esc_html($item['title'] ?? '');
                    $desc = esc_html($item['desc'] ?? '');
                    $qty = floatval($item['qty'] ?? 0);
                    $unit = esc_html($item['unit'] ?? '');
                    $price = floatval($item['price'] ?? 0);
                    $disc = floatval($item['disc'] ?? 0);
                    $taxable = !empty($item['taxable']);

                    $line_base = $qty * $price;
                    $line_disc = ($item['disc_type'] ?? 'amount') === 'percent' ? ($line_base * $disc / 100) : $disc;
                    $line_total = max(0, $line_base - $line_disc);
                ?>
                    <tr>
                        <td><?php echo $title; ?></td>
                        <td><?php echo $desc; ?></td>
                        <td><?php echo esc_html($qty); ?></td>
                        <td><?php echo $unit; ?></td>
                        <td><?php echo esc_html($format_currency($price)); ?></td>
                        <?php if ($show_discount_col) : ?>
                            <td><?php echo esc_html($format_currency($line_disc)); ?></td>
                        <?php endif; ?>
                        <?php if ($show_tax_col) : ?>
                            <td><?php echo $taxable ? number_format($vat_percent, 2) : '0'; ?></td>
                        <?php endif; ?>
                        <td><?php echo esc_html($format_currency($line_total)); ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </section>

        <section class="sib-print__section sib-print__summary">
            <div class="sib-summary-box">
                <div class="sib-summary-row"><span>جمع جزء</span><strong><?php echo esc_html($format_currency($totals['sub_total'])); ?></strong></div>
                <div class="sib-summary-row"><span>تخفیف کل</span><strong><?php echo esc_html($format_currency($totals['global_discount'])); ?></strong></div>
                <div class="sib-summary-row"><span>مالیات</span><strong><?php echo esc_html($format_currency($totals['vat_total'])); ?></strong></div>
                <div class="sib-summary-row"><span>هزینه جانبی</span><strong><?php echo esc_html($format_currency($totals['extra'])); ?></strong></div>
                <?php if ($show_paid_amount && $paid_amount > 0) : ?>
                    <div class="sib-summary-row"><span>مبلغ پرداخت‌شده</span><strong><?php echo esc_html($format_currency($paid_amount)); ?></strong></div>
                <?php endif; ?>
                <div class="sib-summary-total"><span><?php echo esc_html($total_label); ?></span><strong><?php echo esc_html($format_currency($net_total)); ?></strong></div>
            </div>
            <div class="sib-payment-box">
                <h3>اطلاعات پرداخت</h3>
                <div class="sib-payment-row"><span>نام بانک</span><strong><?php echo $bank_name; ?></strong></div>
                <div class="sib-payment-row"><span>شماره کارت</span><strong><?php echo $card_number; ?></strong></div>
                <div class="sib-payment-row"><span>شبا</span><strong><?php echo $iban; ?></strong></div>
                <div class="sib-payment-row"><span>شماره حساب</span><strong><?php echo $account_number; ?></strong></div>
                <div class="sib-payment-row"><span>سررسید</span><strong><?php echo $due_date; ?></strong></div>
                <?php if ($show_paid_amount) : ?>
                    <div class="sib-payment-row"><span>مبلغ پرداخت‌شده</span><strong><?php echo esc_html($format_currency($paid_amount)); ?></strong></div>
                <?php endif; ?>
                <div class="sib-payment-row"><span>تاریخ پرداخت</span><strong><?php echo $paid_at; ?></strong></div>
                <div class="sib-payment-row"><span>یادداشت پرداخت</span><strong><?php echo $paid_note; ?></strong></div>
            </div>
        </section>

        <?php if ($footer_note) : ?>
            <footer class="sib-print__footer">
                <?php echo nl2br($footer_note); ?>
            </footer>
        <?php endif; ?>
    </div>
</body>
</html>
