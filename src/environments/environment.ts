export const environment = {
  production: false,

  // Data/hora do evento (ajustada para 20:00 -03:00)
  eventDateISO: "2025-12-19T20:00:00-03:00",

  // Endereço com venue (após "|") e CEP opcional dentro do texto:
  // A parte antes do "|" é o endereço principal; se houver CEP nele, o CEP será exibido ao lado.
  addressText: "R. Alfredina Amaral, 75 - Milionários, Belo Horizonte/MG | Casa da Alegria",

  // Query que será usada no Google Maps (altere se quiser usar um ponto específico)
  mapsQuery: "R. Alfredina Amaral, 75 - Milionários, Belo Horizonte - MG, 30620-220",

  // Caminho do arquivo ICS
  icsPath: "assets/event.ics",

  // URLs de ações
  giftListUrl: "https://example.com/lista-de-presentes",
  rsvpUrl: "/api/rsvp", // ou uma página/form externo caso prefira

  // Galeria (troque pelos seus arquivos/links)
  photos: [
    "/assets/photos/01.jpg",
    "/assets/photos/02.jpg",
    "/assets/photos/03.jpg",
    "/assets/photos/04.jpg",
    "/assets/photos/05.jpg",
    "/assets/photos/06.jpg",
    "/assets/photos/07.jpg",
    "/assets/photos/08.jpg",
    "/assets/photos/09.jpg",
    "/assets/photos/10.jpg",
    "/assets/photos/11.jpg",
    "/assets/photos/12.jpg"
  ]
};
