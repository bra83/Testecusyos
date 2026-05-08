
export type AdType = 'classico' | 'premium';
export type Marketplace = 'mercadolivre' | 'shopee' | 'amazon';

export interface Category {
  id: string;
  name: string;
  classicoRate: number;
  premiumRate: number;
}

export const AMAZON_CATEGORIES = [
  { id: 'eletronicos', name: 'Eletrônicos e Acessórios', rate: 0.13 },
  { id: 'casa', name: 'Casa e Cozinha', rate: 0.15 },
  { id: 'livros', name: 'Livros', rate: 0.15 },
  { id: 'beleza', name: 'Beleza e Cuidado Pessoal', rate: 0.15 },
  { id: 'brinquedos', name: 'Brinquedos e Jogos', rate: 0.15 },
  { id: 'roupas', name: 'Vestuário e Acessórios', rate: 0.15 },
  { id: 'dispositivos_amazon', name: 'Dispositivos Amazon', rate: 0.15 },
  { id: 'informatica', name: 'Informática e Celulares', rate: 0.13 },
  { id: 'pet_shop', name: 'Pet Shop', rate: 0.15 },
  { id: 'outros', name: 'Demais Categorias', rate: 0.15 },
];

export const CATEGORIES: Category[] = [
  { id: 'acessorios_veiculos', name: 'Acessórios para Veículos', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'alimentos_bebidas', name: 'Alimentos e Bebidas', classicoRate: 0.11, premiumRate: 0.16 },
  { id: 'animais', name: 'Animais', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'antiguidades', name: 'Antiguidades e Coleções', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'arte', name: 'Arte, Papelaria e Armarinho', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'bebes', name: 'Bebês', classicoRate: 0.12, premiumRate: 0.17 },
  { id: 'beleza', name: 'Beleza e Cuidado Pessoal', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'brinquedos', name: 'Brinquedos e Hobbies', classicoRate: 0.12, premiumRate: 0.17 },
  { id: 'calcados_roupas', name: 'Calçados, Roupas e Bolsas', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'cameras', name: 'Câmeras e Acessórios', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'casa_moveis', name: 'Casa, Móveis e Decoração', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'celulares', name: 'Celulares e Telefone', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'eletrodomesticos', name: 'Eletrodomésticos', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'eletronicos', name: 'Eletrônicos, Áudio e Vídeo', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'esportes', name: 'Esportes e Fitness', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'ferramentas', name: 'Ferramentas', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'festas', name: 'Festas e Lembrancinhas', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'games', name: 'Games', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'informatica', name: 'Informática', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'instrumentos', name: 'Instrumentos Musicais', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'joias', name: 'Joias e Relógios', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'livros', name: 'Livros, Revistas e Comics', classicoRate: 0.10, premiumRate: 0.15 },
  { id: 'outros', name: 'Mais Categorias', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'musica', name: 'Música, Filmes e Seriados', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'saude', name: 'Saúde', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'agro', name: 'Agro', classicoRate: 0.13, premiumRate: 0.18 },
  { id: 'industria', name: 'Indústria e Comércio', classicoRate: 0.13, premiumRate: 0.18 },
];

export const ML_FIXED_FEE_LIMIT = 79.00;
export const ML_FIXED_FEE_AMOUNT = 6.00;

export const SHOPEE_COMMISSION_STANDARD = 0.14;
export const SHOPEE_FREE_SHIPPING_PROGRAM = 0.06;
export const SHOPEE_FIXED_FEE = 3.00;
export const SHOPEE_COMMISSION_CAP = 103.00;

export const AMAZON_MIN_REFERRAL_FEE = 1.00;
export interface AmazonFBATier {
  id: string;
  name: string;
  cost: number;
}

export const AMAZON_FBA_TIERS: AmazonFBATier[] = [
  { id: 'pequeno', name: 'Pequeno (< 500g)', cost: 13.50 },
  { id: 'medio_1', name: 'Médio 1 (500g - 1kg)', cost: 15.90 },
  { id: 'medio_2', name: 'Médio 2 (1kg - 2kg)', cost: 18.50 },
  { id: 'grande_1', name: 'Grande 1 (2kg - 5kg)', cost: 24.90 },
  { id: 'grande_2', name: 'Grande 2 (5kg - 10kg)', cost: 35.90 },
  { id: 'extra_grande', name: 'Extra Grande (> 10kg)', cost: 59.90 },
];
export const AMAZON_FIXED_FEE_ACCOUNT = 0.00; // Colaboradores profissionais não pagam por item

export interface ShippingRate {
  weight: string;
  cost: number;
}

// Preços médios de frete (ME2) já com desconto médio de 40-50% (Reputação Verde)
export const SHIPPING_RATES: ShippingRate[] = [
  { weight: 'Até 300g', cost: 19.90 },
  { weight: '300g a 500g', cost: 21.90 },
  { weight: '500g a 1kg', cost: 24.90 },
  { weight: '1kg a 2kg', cost: 27.90 },
  { weight: '2kg a 5kg', cost: 38.90 },
  { weight: '5kg a 9kg', cost: 54.90 },
  { weight: '9kg a 13kg', cost: 74.90 },
  { weight: '13kg a 17kg', cost: 92.90 },
  { weight: '17kg a 23kg', cost: 114.90 },
  { weight: '23kg a 30kg', cost: 134.90 },
];
