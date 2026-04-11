import { Platform } from 'react-native';
import { useUserStore } from '../stores/userStore';

// RevenueCat ne fonctionne pas dans Expo Go
// Ce fichier sera actif dans le dev build / production
let Purchases: any = null;

try {
  Purchases = require('react-native-purchases').default;
} catch {
  // Module non disponible dans Expo Go
}

// TODO : remplacer par tes vraies cles RevenueCat
const REVENUECAT_IOS_KEY = 'appl_VOTRE_CLE_IOS';
const REVENUECAT_ANDROID_KEY = 'goog_VOTRE_CLE_ANDROID';

/**
 * Initialise RevenueCat au demarrage de l'app
 */
export async function initPurchases() {
  if (!Purchases) return;

  const key = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  await Purchases.configure({ apiKey: key });
}

/**
 * Verifie le statut Pro de l'utilisateur
 */
export async function checkProStatus(): Promise<boolean> {
  if (!Purchases) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPro = customerInfo.entitlements.active['pro'] !== undefined;
    useUserStore.getState().setIsPro(isPro);
    return isPro;
  } catch {
    return false;
  }
}

/**
 * Recupere les offres disponibles
 */
export async function getOfferings() {
  if (!Purchases) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

/**
 * Acheter un package
 */
export async function purchasePackage(pkg: any): Promise<boolean> {
  if (!Purchases) return false;

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = customerInfo.entitlements.active['pro'] !== undefined;
    useUserStore.getState().setIsPro(isPro);
    return isPro;
  } catch {
    return false;
  }
}

/**
 * Restaurer les achats (obligatoire Apple)
 */
export async function restorePurchases(): Promise<boolean> {
  if (!Purchases) return false;

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active['pro'] !== undefined;
    useUserStore.getState().setIsPro(isPro);
    return isPro;
  } catch {
    return false;
  }
}
