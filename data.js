// ============================================================
// DADOS DA VIAGEM — edite este arquivo à vontade.
// Cada "stop" é um lugar que você vai visitar.
// Cada "route" é um trajeto entre dois stops (avião, trem ou ônibus).
// As coordenadas (lat/lon) você encontra pesquisando "nome da cidade
// latitude longitude" no Google.
// ============================================================

const TRIP = {
  title: "Minha viagem à China",
  subtitle: "De Curitiba à China, passando por Istambul",

  // Ordem cronológica das paradas da viagem
  stops: [
    {
      id: "curitiba",
      name: "Curitiba",
      country: "Brasil",
      lat: -25.4284,
      lon: -49.2733,
      date: "09 out",
      tag: "Partida",
      description:
        "Saída de Curitiba às 20h20 com destino a São Paulo.",
    },
    {
      id: "sao-paulo",
      name: "São Paulo",
      country: "Brasil",
      lat: -23.5505,
      lon: -46.6333,
      date: "09–10 out",
      tag: "Conexão",
      description:
        "Chegada de Curitiba e conexão para Istambul no dia 10/10.",
    },
    {
      id: "istambul",
      name: "Istambul",
      country: "Turquia",
      lat: 41.0082,
      lon: 28.9784,
      date: "10–11 out",
      tag: "Conexão",
      description:
        "Chegada no dia 10/10 e saída no dia 11/10 para Guangzhou.",
    },
    {
      id: "guangzhou",
      name: "Guangzhou",
      country: "China",
      lat: 23.1291,
      lon: 113.2644,
      date: "12 out",
      tag: "Chegada",
      description:
        "Chegada na segunda-feira, 12/10. Ida a Shenzhen no mesmo dia.",
    },
    {
      id: "shenzhen",
      name: "Shenzhen",
      country: "China",
      lat: 22.5431,
      lon: 114.0579,
      date: "12–15 out",
      tag: "Compras",
      labelOffset: [0.04, 0, 0.05],
      description:
        "Estadia em Shenzhen de 12/10 a 15/10. Passeio de metrô até Hong Kong no dia 14/10.",
    },
    {
      id: "hong-kong",
      name: "Hong Kong",
      country: "China (RAE)",
      lat: 22.3193,
      lon: 114.1694,
      date: "14 out",
      tag: "Kowloon Bay",
      labelOffset: [0, -0.04, 0.05],
      description:
        "Passeio de um dia saindo de Shenzhen e retorno de metrô.",
    },
    {
      id: "guangzhou-local",
      name: "Guangzhou",
      country: "China",
      lat: 23.1291,
      lon: 113.2644,
      date: "15–17 out",
      tag: "Canton Fair",
      showMarker: false,
      description:
        "Retorno de metrô de Shenzhen para Guangzhou no dia 15/10. Estadia até 17/10.",
    },
    {
      id: "beijing",
      name: "Beijing",
      country: "China",
      lat: 39.9042,
      lon: 116.4074,
      date: "17–21 out",
      tag: "Muralha da China",
      description:
        "Voo de Guangzhou no dia 17/10. Estadia até 21/10.",
    },
    {
      id: "nanjing",
      name: "Nanjing",
      country: "China",
      lat: 32.0603,
      lon: 118.7969,
      date: "21–24 out",
      tag: "História",
      labelOffset: [0, -0.025, 0.05],
      description:
        "Viagem de trem partindo de Beijing no dia 21/10. Estadia até 24/10.",
    },
    {
      id: "yangzhou",
      name: "Yangzhou",
      country: "China",
      lat: 32.3936,
      lon: 119.4127,
      date: "24–27 out",
      tag: "Família ❤️",
      description:
        "Estadia em Yangzhou de 24/10 a 27/10.",
    },
    {
      id: "shanghai",
      name: "Shanghai",
      country: "China",
      lat: 31.2304,
      lon: 121.4737,
      date: "27–30 out",
      tag: "The Bund",
      description:
        "Chegada em 27/10. Estadia até 30/10, quando retorna de avião para Guangzhou.",
    },
    {
      id: "guangzhou-retorno",
      name: "Guangzhou",
      country: "China",
      lat: 23.1291,
      lon: 113.2644,
      date: "30 out",
      tag: "Retorno",
      showMarker: false,
      description:
        "Retorno de avião de Shanghai para Guangzhou no dia 30/10.",
    },
    {
      id: "istambul-retorno",
      name: "Istambul",
      country: "Turquia",
      lat: 41.0082,
      lon: 28.9784,
      date: "31 out",
      tag: "Conexão",
      showMarker: false,
      description:
        "Parada em Istambul durante o voo de volta ao Brasil.",
    },
    {
      id: "saopaulo-retorno",
      name: "São Paulo",
      country: "Brasil",
      lat: -23.5505,
      lon: -46.6333,
      date: "31 out",
      tag: "Conexão",
      showLabel: false,
      description:
        "Chegada a São Paulo no dia 31/10, após a parada em Istambul.",
    },
    {
      id: "curitiba-retorno",
      name: "Curitiba",
      country: "Brasil",
      lat: -25.4284,
      lon: -49.2733,
      date: "01 nov",
      tag: "Retorno",
      showLabel: false,
      description:
        "Chegada a Curitiba no dia 01/11, concluindo a viagem.",
    }
  ],

  // Trajetos entre as paradas. "type" pode ser: "voo", "trem" ou "onibus"
  routes: [
    { from: "curitiba", to: "sao-paulo", type: "voo", phase: "ida" },
    { from: "sao-paulo", to: "istambul", type: "voo", phase: "ida" },
    { from: "istambul", to: "guangzhou", type: "voo", phase: "ida" },
    { from: "guangzhou", to: "shenzhen", type: "metro", phase: "roteiro" },
    { from: "shenzhen", to: "hong-kong", type: "metro", phase: "roteiro" },
    { from: "hong-kong", to: "shenzhen", type: "metro", phase: "roteiro" },
    { from: "shenzhen", to: "guangzhou-local", type: "metro", phase: "roteiro" },
    { from: "guangzhou-local", to: "beijing", type: "voo", phase: "roteiro" },
    { from: "beijing", to: "nanjing", type: "trem", phase: "ida" },
    { from: "nanjing", to: "yangzhou", type: "trem", phase: "ida" },
    { from: "yangzhou", to: "shanghai", type: "trem", phase: "ida" },
    { from: "shanghai", to: "guangzhou-retorno", type: "voo", phase: "volta" },
    { from: "guangzhou-retorno", to: "istambul-retorno", type: "voo", phase: "volta" },
    { from: "istambul-retorno", to: "saopaulo-retorno", type: "voo", phase: "volta" },
    { from: "saopaulo-retorno", to: "curitiba-retorno", type: "voo", phase: "volta" },
  ],
};

// Cores e rótulos de cada tipo de trajeto — mude aqui se quiser outras cores
const ROUTE_STYLES = {
  voo: { color: 0xc9a24b, label: "Avião" },
  trem: { color: 0x6fb3a8, label: "Trem" },
  metro: { color: 0x8e7dff, label: "Metrô" },
  onibus: { color: 0xc1432e, label: "Ônibus" },
};

export { TRIP, ROUTE_STYLES };
