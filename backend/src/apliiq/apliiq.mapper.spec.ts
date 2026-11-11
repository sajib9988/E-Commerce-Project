import { BadRequestException } from '@nestjs/common';
import { mapOrderToApliiq } from './apliiq.mapper';

const baseOrder = {
  id: 'order_123',
  orderNumber: 'ORD-123',
  currency: 'usd',
  customerEmail: 'customer@example.com',
  customerName: 'Sajib Biswas',
  customerPhone: '+15125550123',
  shippingAddress: {
    firstName: 'Sajib',
    lastName: 'Biswas',
    addressLine1: '123 Main Street',
    addressLine2: 'Suite 4',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'United States',
    countryCode: 'US',
    phone: '+15125550123',
  },
  items: [{
    id: 'item_123',
    productName: 'Classic Tee',
    sku: 'STORE-TEE-M',
    apliiqDesignSku: 'APLIIQ-TEE-M',
    quantity: 2,
    unitPrice: '24.00',
  }],
};

describe('mapOrderToApliiq', () => {
  it('maps the checkout AddressDto field names to Apliiq shipping fields', () => {
    const payload = mapOrderToApliiq(baseOrder);

    expect(payload.shipping_address).toEqual({
      first_name: 'Sajib',
      last_name: 'Biswas',
      address1: '123 Main Street',
      address2: 'Suite 4',
      phone: '+15125550123',
      city: 'Austin',
      zip: '78701',
      province: 'TX',
      province_code: '',
      country: 'United States',
      country_code: 'US',
    });
    expect(payload.line_items[0]).toEqual(expect.objectContaining({
      sku: 'APLIIQ-TEE-M',
      quantity: 2,
      price: 24,
    }));
  });

  it('rejects incomplete shipping addresses before provider submission', () => {
    expect(() => mapOrderToApliiq({
      ...baseOrder,
      shippingAddress: { ...baseOrder.shippingAddress, postalCode: '' },
    })).toThrow(BadRequestException);
  });
});
