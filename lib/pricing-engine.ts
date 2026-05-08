
import { 
  AdType, 
  Category, 
  CATEGORIES,
  Marketplace,
  ML_FIXED_FEE_AMOUNT, 
  ML_FIXED_FEE_LIMIT,
  SHOPEE_COMMISSION_STANDARD,
  SHOPEE_FREE_SHIPPING_PROGRAM,
  SHOPEE_FIXED_FEE,
  SHOPEE_COMMISSION_CAP,
  AMAZON_CATEGORIES,
  AMAZON_MIN_REFERRAL_FEE,
  AMAZON_FBA_TIERS
} from '../constants';

export interface PricingInput {
  cost: number;
  categoryId?: string;
  amazonTierId?: string;
  category?: Category;
  adType: AdType;
  shipping: number;
  adsPercent: number;
  fulfillment: number;
  taxPercent: number;
  targetMarginPercent: number;
  marketplace?: Marketplace;
}

export function calculatePrice(input: PricingInput): PricingResult {
  const marketplace = input.marketplace || 'mercadolivre';
  
  if (marketplace === 'shopee') {
    return calculateShopeePrice(input);
  }
  
  if (marketplace === 'amazon') {
    return calculateAmazonPrice(input);
  }
  
  return calculateMLPrice(input);
}

function calculateMLPrice(input: PricingInput): PricingResult {
  const {
    cost,
    category: providedCategory,
    categoryId,
    adType,
    shipping: baseShipping,
    adsPercent,
    fulfillment,
    taxPercent,
    targetMarginPercent,
  } = input;

  const category = providedCategory || CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  const categoryRate = adType === 'classico' ? category.classicoRate : category.premiumRate;
  const adsRate = adsPercent / 100;
  const taxRate = taxPercent / 100;
  const targetMarginRate = targetMarginPercent / 100;

  const calculateWithParams = (fixed: number, paysShipping: boolean) => {
    const denominator = 1 - categoryRate - adsRate - taxRate - targetMarginRate;
    if (denominator <= 0) return 999999;
    const actualShipping = paysShipping ? baseShipping : 0;
    return (cost + fixed + actualShipping + fulfillment) / denominator;
  };

  let salePrice = calculateWithParams(ML_FIXED_FEE_AMOUNT, false);
  let fixedFee = ML_FIXED_FEE_AMOUNT;
  let sellerShipping = 0;

  if (salePrice >= ML_FIXED_FEE_LIMIT) {
    salePrice = calculateWithParams(0, true);
    fixedFee = 0;
    sellerShipping = baseShipping;
  }

  const commission = salePrice * categoryRate;
  const ads = salePrice * adsRate;
  const taxes = salePrice * taxRate;
  const netProfit = salePrice - cost - commission - fixedFee - sellerShipping - ads - fulfillment - taxes;
  const realMarginPercent = (netProfit / salePrice) * 100;

  const breakEvenDenominator = 1 - categoryRate - adsRate - taxRate;
  let breakEvenPrice = (cost + ML_FIXED_FEE_AMOUNT + 0 + fulfillment) / breakEvenDenominator;
  if (breakEvenPrice >= ML_FIXED_FEE_LIMIT) {
    breakEvenPrice = (cost + 0 + baseShipping + fulfillment) / breakEvenDenominator;
  }

  return {
    salePrice,
    commission: commission,
    fixedFee,
    shipping: sellerShipping,
    ads,
    fulfillment,
    taxes,
    netProfit,
    realMarginPercent,
    breakEvenPrice,
    components: {
      commissionAbs: commission + fixedFee,
      shippingTotal: sellerShipping,
      adsAbs: ads,
      taxesAbs: taxes,
      fulfillmentAbs: fulfillment,
      productCost: cost
    }
  };
}

function calculateShopeePrice(input: PricingInput): PricingResult {
  const {
    cost,
    adType, // We'll use this to decide if Free Shipping Program is active
    shipping: baseShipping,
    adsPercent,
    taxPercent,
    targetMarginPercent,
  } = input;

  // Shopee rates
  const commissionRate = SHOPEE_COMMISSION_STANDARD + (adType === 'premium' ? SHOPEE_FREE_SHIPPING_PROGRAM : 0);
  const adsRate = adsPercent / 100;
  const taxRate = taxPercent / 100;
  const targetMarginRate = targetMarginPercent / 100;

  // For Shopee, commission is capped at SHOPEE_COMMISSION_CAP.
  // This makes it a bit tricky because the cost becomes fixed if Price * Rate > CAP.
  
  const calculateWithVariableCommission = () => {
    const denominator = 1 - commissionRate - adsRate - taxRate - targetMarginRate;
    if (denominator <= 0) return 999999;
    return (cost + SHOPEE_FIXED_FEE + baseShipping) / denominator;
  };

  const calculateWithCappedCommission = () => {
    const denominator = 1 - adsRate - taxRate - targetMarginRate;
    if (denominator <= 0) return 999999;
    return (cost + SHOPEE_FIXED_FEE + SHOPEE_COMMISSION_CAP + baseShipping) / denominator;
  };

  let salePrice = calculateWithVariableCommission();
  let commission = salePrice * commissionRate;
  let isCapped = false;

  if (commission > SHOPEE_COMMISSION_CAP) {
    salePrice = calculateWithCappedCommission();
    commission = SHOPEE_COMMISSION_CAP;
    isCapped = true;
  }

  const ads = salePrice * adsRate;
  const taxes = salePrice * taxRate;
  const fixedFee = SHOPEE_FIXED_FEE;
  const netProfit = salePrice - cost - commission - fixedFee - baseShipping - ads - taxes;
  const realMarginPercent = (netProfit / salePrice) * 100;

  // Breakeven logic
  const beDenominatorVar = 1 - commissionRate - adsRate - taxRate;
  let breakEvenPrice = (cost + SHOPEE_FIXED_FEE + baseShipping) / beDenominatorVar;
  
  if (breakEvenPrice * commissionRate > SHOPEE_COMMISSION_CAP) {
    const beDenominatorCap = 1 - adsRate - taxRate;
    breakEvenPrice = (cost + SHOPEE_FIXED_FEE + SHOPEE_COMMISSION_CAP + baseShipping) / beDenominatorCap;
  }

  return {
    salePrice,
    commission,
    fixedFee,
    shipping: baseShipping,
    ads,
    fulfillment: 0,
    taxes,
    netProfit,
    realMarginPercent,
    breakEvenPrice,
    components: {
      commissionAbs: commission + fixedFee,
      shippingTotal: baseShipping,
      adsAbs: ads,
      taxesAbs: taxes,
      fulfillmentAbs: 0,
      productCost: cost
    }
  };
}

function calculateAmazonPrice(input: PricingInput): PricingResult {
  const {
    cost,
    categoryId,
    shipping: baseShipping, // Can be used for own shipping if not FBA
    adsPercent,
    taxPercent,
    targetMarginPercent,
    fulfillment: fbaCostInput,
    amazonTierId,
  } = input;

  const amazonCategory = AMAZON_CATEGORIES.find(c => c.id === categoryId) || AMAZON_CATEGORIES[AMAZON_CATEGORIES.length - 1];
  const amazonTier = AMAZON_FBA_TIERS.find(t => t.id === amazonTierId) || AMAZON_FBA_TIERS[0];
  const fbaCost = amazonTierId ? amazonTier.cost : fbaCostInput;
  const commissionRate = amazonCategory.rate;
  const adsRate = adsPercent / 100;
  const taxRate = taxPercent / 100;
  const targetMarginRate = targetMarginPercent / 100;

  // For Amazon: Price = (Costs) / (1 - Rates)
  // Referral fee has a minimum (usually R$ 1)
  const calculateWithVariableCommission = () => {
    const denominator = 1 - commissionRate - adsRate - taxRate - targetMarginRate;
    if (denominator <= 0) return 999999;
    return (cost + baseShipping + fbaCost) / denominator;
  };

  const calculateWithMinCommission = () => {
    const denominator = 1 - adsRate - taxRate - targetMarginRate;
    if (denominator <= 0) return 999999;
    return (cost + baseShipping + fbaCost + AMAZON_MIN_REFERRAL_FEE) / denominator;
  };

  let salePrice = calculateWithVariableCommission();
  let commission = salePrice * commissionRate;

  if (commission < AMAZON_MIN_REFERRAL_FEE) {
    salePrice = calculateWithMinCommission();
    commission = AMAZON_MIN_REFERRAL_FEE;
  }

  const ads = salePrice * adsRate;
  const taxes = salePrice * taxRate;
  
  const netProfit = salePrice - cost - commission - baseShipping - fbaCost - ads - taxes;
  const realMarginPercent = (netProfit / salePrice) * 100;

  // Breakeven
  const beDenominatorVar = 1 - commissionRate - adsRate - taxRate;
  let breakEvenPrice = (cost + baseShipping + fbaCost) / beDenominatorVar;
  if (breakEvenPrice * commissionRate < AMAZON_MIN_REFERRAL_FEE) {
    const beDenominatorMin = 1 - adsRate - taxRate;
    breakEvenPrice = (cost + baseShipping + fbaCost + AMAZON_MIN_REFERRAL_FEE) / beDenominatorMin;
  }

  return {
    salePrice,
    commission,
    fixedFee: 0,
    shipping: baseShipping,
    ads,
    fulfillment: fbaCost,
    taxes,
    netProfit,
    realMarginPercent,
    breakEvenPrice,
    components: {
      commissionAbs: commission,
      shippingTotal: baseShipping,
      adsAbs: ads,
      taxesAbs: taxes,
      fulfillmentAbs: fbaCost,
      productCost: cost
    }
  };
}

export interface PricingResult {
  salePrice: number;
  commission: number;
  fixedFee: number;
  shipping: number;
  ads: number;
  fulfillment: number;
  taxes: number;
  netProfit: number;
  realMarginPercent: number;
  breakEvenPrice: number;
  components: {
    commissionAbs: number;
    shippingTotal: number;
    adsAbs: number;
    taxesAbs: number;
    fulfillmentAbs: number;
    productCost: number;
  };
}
