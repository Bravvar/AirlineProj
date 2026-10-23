import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false, 
    },
    resources: {
      en: {
        translation: {
          "My Trips": "My Trips",
          "Sign In": "Sign In",
          "Welcome Back": "Welcome Back",
          "Create an Account": "Create an Account",
          "Stays": "Stays",
          "Flights": "Flights",
          "Cars": "Cars",
          "Packages": "Packages",
          "Deals": "Deals",
          "Deals for top destinations": "Deals for top destinations",
          "See all": "See all",
          "Claim now": "Claim now"
        }
      },
      es: {
        translation: {
          "My Trips": "Mis viajes",
          "Sign In": "Iniciar sesión",
          "Welcome Back": "Bienvenido de nuevo",
          "Create an Account": "Crear una cuenta",
          "Stays": "Estadías",
          "Flights": "Vuelos",
          "Cars": "Autos",
          "Packages": "Paquetes",
          "Deals": "Ofertas",
          "Deals for top destinations": "Ofertas para destinos populares",
          "See all": "Ver todo",
          "Claim now": "Reclamar ahora"
        }
      },
      fr: {
        translation: {
          "My Trips": "Mes voyages",
          "Sign In": "Se connecter",
          "Welcome Back": "Bon retour",
          "Create an Account": "Créer un compte",
          "Stays": "Séjours",
          "Flights": "Vols",
          "Cars": "Voitures",
          "Packages": "Forfaits",
          "Deals": "Offres",
          "Deals for top destinations": "Offres pour les meilleures destinations",
          "See all": "Voir tout",
          "Claim now": "Réclamer maintenant"
        }
      }
    }
  });

export default i18n;