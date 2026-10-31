import { BadRequestException } from '@nestjs/common';

type AddressSnapshot = {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string | null;
  phone?: string | null;
  city?: string;
  zip?: string;
  province?: string;
  provinceCode?: string;
  country?: string;
  countryCode?: string;
};

type PaidOrderForApliiq = {
  id: string;
  orderNumber: string;
  currency: string;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingAddress: unknown;
  items: Array<{
    id: string;
    productName: string;
    sku?: string | null;
    quantity: number;
    unitPrice: unknown;
    variantSnapshot?: unknown;
  }>;
};

function asAddress(value: unknown): AddressSnapshot {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('Order shipping address is missing');
  }
  return value as AddressSnapshot;
}

export function mapOrderToApliiq(order: PaidOrderForApliiq) {
  const address = asAddress(order.shippingAddress);
  const nameParts = (order.customerName ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = address.firstName ?? nameParts[0];
  const lastName = address.lastName ?? nameParts.slice(1).join(' ');

  if (
    !firstName || !lastName || !address.address1 || !address.city ||
    !address.zip || !address.province || !address.country ||
    !address.countryCode
  ) {
    throw new BadRequestException('Required Apliiq shipping fields are missing');
  }

  const lineItems = order.items.map((item) => {
    // sku must be the Apliiq sellable DESIGN SKU, not merely a blank-garment SKU.
    const sku = item.sku?.trim();
    if (!sku) {
      throw new BadRequestException(
        `Order item ${item.id} has no mapped Apliiq design SKU`,
      );
    }

    const price = Number(String(item.unitPrice));
    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException('Invalid saved order-item price');
    }

    return {
      id: item.id,
      title: item.productName,
      name: item.productName,
      quantity: item.quantity,
      price,
      sku,
    };
  });

  return {
    id: order.id,
    number: order.orderNumber,
    name: order.orderNumber,
    order_number: order.orderNumber,
    email: order.customerEmail,
    line_items: lineItems,
    shipping_address: {
      first_name: firstName,
      last_Name: lastName,
      address1: address.address1,
      address2: address.address2 ?? '',
      phone: address.phone ?? order.customerPhone ?? '',
      city: address.city,
      zip: address.zip,
      province: address.province,
      province_code: address.provinceCode ?? '',
      country: address.country,
      country_code: address.countryCode.toUpperCase(),
    },
    shipping_lines: [{ code: 'standard' }],
  };
}
