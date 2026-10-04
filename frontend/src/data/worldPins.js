// Pixel size of /public/world-map.webp. Pin x/y are pixel coordinates on that image,
// measured from the top-left corner.
export const WORLD_IMAGE = {
  src: '/world-map.webp',
  width: 1008,
  height: 1008,
}

export const worldPins = [
  {
    id: 'dhofar-rub-al-khali',
    name: "Rub' al Khali & Khareef",
    region: 'Dhofar, Oman',
    x: 645,
    y: 468,
    detailImage: '/maps/oman-dhofar.webp',
    summary:
      "Southern Oman, where the Dhofar mountains meet the edge of the Rub' al Khali, one of the largest continuous sand deserts on Earth. During the khareef monsoon, roughly late June to September, mist rolls in and turns the coastal range green.",
  },
  {
    id: 'raja-ampat',
    name: 'Raja Ampat',
    region: 'West Papua, Indonesia',
    x: 855,
    y: 527,
    detailImage: '/maps/raja-ampat.webp',
    summary:
      'An archipelago off the northwest tip of New Guinea, made up of more than 1,500 small islands around four main ones: Waigeo, Batanta, Salawati and Misool. Its reefs hold some of the highest marine biodiversity recorded anywhere.',
  },
]
