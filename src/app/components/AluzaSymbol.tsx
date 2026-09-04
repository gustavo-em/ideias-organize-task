import Svg, { Path } from 'react-native-svg';

/**
 * The brand symbol, drawn instead of loaded.
 *
 * `AppMark` still ships the PNG lockup used by the splash and the store; this
 * is the symbol alone, at the sizes the brand screens ask for (32 on a step,
 * 44 on the entrance). A PNG at 32dp is a blur on a 3× screen, and the symbol
 * needs a different pair of colours on each ground — one file per combination
 * is three files to keep in step. One path, two fills, no assets.
 *
 * The geometry is the kit's smooth variant (`aluza-symbol-on-sol-smooth.svg`).
 * The kit also carries a polygonal cut of the same silhouette for the dark and
 * yellow tiles; those approximate these curves in steps, so the smooth path is
 * used on every ground.
 */
/** The kit's box, padded on every side, so the symbol keeps the same
 * optical margin it has in the brand files. */
export const ALUZA_VIEW_BOX = '-69.76 -69.76 1011.52 1011.52';

export type AluzaSymbolVariant = 'onSol' | 'onTinta' | 'primary';

interface AluzaSymbolProps {
  size?: number;
  /** Which ground the symbol sits on. Decides the two fills, nothing else. */
  variant?: AluzaSymbolVariant;
}

/** The body: the ring opening to the right. Exported because the splash
 * animates the two halves apart — the letter opens first, the rays arrive
 * later as the three task rows land. */
export const ALUZA_BODY =
  'M104 261C78.5 287.2 60 315.7 44 345C28 374.3 15.3 414.3 8 437C0.7 459.7 1.3 458.2 0 481C-1.3 503.8 -6 539.2 0 574C6 608.8 24 661.3 36 690C48 718.7 56.5 727.2 72 746C87.5 764.8 113.5 789.5 129 803C144.5 816.5 145 817 165 827C185 837 229 855.7 249 863C269 870.3 262.8 869.7 285 871C307.2 872.3 356.5 873 382 871C407.5 869 418 865.7 438 859C458 852.3 476 847.7 502 831C528 814.3 573.7 761.8 594 759C614.3 756.2 613.5 799.3 624 814C634.5 828.7 646.8 838.8 657 847C667.2 855.2 676.3 859 685 863C693.7 867 696.2 869.7 709 871C721.8 872.3 747 874.5 762 871C777 867.5 790.8 858.2 799 850C807.2 841.8 810.3 832.2 811 822C811.7 811.8 807.2 797.3 803 789C798.8 780.7 797 778.2 786 772C775 765.8 750.2 763 737 752C723.8 741 714.7 725 707 706C699.3 687 693 672.8 691 638C689 603.2 696.3 524.5 695 497C693.7 469.5 689.2 479.8 683 473C676.8 466.2 667.7 459.5 658 456C648.3 452.5 636.7 449.2 625 452C613.3 454.8 596.2 464.8 588 473C579.8 481.2 579.3 483.5 576 501C572.7 518.5 574.7 553.8 568 578C561.3 602.2 551 624.3 536 646C521 667.7 501 691 478 708C455 725 426.2 740 398 748C369.8 756 337.8 759.3 309 756C280.2 752.7 250 742.3 225 728C200 713.7 176 691 159 670C142 649 131 624.7 123 602C115 579.3 111.7 557.5 111 534C110.3 510.5 112.3 485.8 119 461C125.7 436.2 134.7 410 151 385C167.3 360 196 329.3 217 311C238 292.7 255.7 284.3 277 275C298.3 265.7 320.2 258.3 345 255C369.8 251.7 400 250.3 426 255C452 259.7 483.7 279 501 283C518.3 287 519 285.2 530 279C541 272.8 560.8 257.7 567 246C573.2 234.3 570.5 220 567 209C563.5 198 566.8 190.8 546 180C525.2 169.2 479.5 150 442 144C404.5 138 353.2 140.7 321 144C288.8 147.3 269.7 156.7 249 164C228.3 171.3 221.2 171.8 197 188C172.8 204.2 129.5 234.8 104 261Z';

/** The spark: the four rays leaving the opening. */
export const ALUZA_SPARK =
  'M752 317C750.7 324.2 747.5 339.3 757 347C766.5 354.7 793.5 359.7 809 363C824.5 366.3 839.7 370.5 850 367C860.3 363.5 868.8 350.3 871 342C873.2 333.7 867.2 322.7 863 317C858.8 311.3 862.3 310.2 846 308C829.7 305.8 780.7 302.5 765 304C749.3 305.5 753.3 309.8 752 317Z M565 196C553.2 195.5 567.2 241.3 564 254C560.8 266.7 555.3 266.7 546 272C536.7 277.3 504.3 275.2 508 286C511.7 296.8 553.2 319.5 568 337C582.8 354.5 587.5 380 597 391C606.5 402 615.5 401.7 625 403C634.5 404.3 645.7 403.2 654 399C662.3 394.8 670.2 384.8 675 378C679.8 371.2 683.7 368.8 683 358C682.3 347.2 679 329.8 671 313C663 296.2 652.7 276.5 635 257C617.3 237.5 576.8 196.5 565 196Z M867 149C863.5 141.3 858.3 137.5 850 136C841.7 134.5 837.3 128.5 817 140C796.7 151.5 742.8 190 728 205C713.2 220 725.8 223.7 728 230C730.2 236.3 735.3 240.8 741 243C746.7 245.2 742.5 250.3 762 243C781.5 235.7 839.8 209.2 858 199C876.2 188.8 869.5 190.3 871 182C872.5 173.7 870.5 156.7 867 149Z M702 0C693 -3.5 681.3 -3.5 673 0C664.7 3.5 660.2 1.5 652 21C643.8 40.5 628.7 97.5 624 117C619.3 136.5 620.5 131 624 138C627.5 145 638 155.5 645 159C652 162.5 659.7 161.8 666 159C672.3 156.2 672.8 160.8 683 142C693.2 123.2 719.7 66.2 727 46C734.3 25.8 731.2 28.7 727 21C722.8 13.3 711 3.5 702 0Z';

/**
 * On Sol the spark is white, so it reads as light coming off the mark rather
 * than as a second yellow on a yellow floor. On Tinta the body turns to paper
 * and the spark takes the brand yellow. On a light ground both are the ink and
 * yellow of the primary lockup.
 */
const FILLS: Record<AluzaSymbolVariant, { body: string; spark: string }> = {
  onSol: { body: '#1D1D1B', spark: '#FFFFFF' },
  onTinta: { body: '#FFFFFF', spark: '#FFC107' },
  primary: { body: '#1D1D1B', spark: '#FFC107' },
};

export function AluzaSymbol({
  size = 32,
  variant = 'primary',
}: AluzaSymbolProps) {
  const fills = FILLS[variant];

  return (
    <Svg height={size} viewBox={ALUZA_VIEW_BOX} width={size}>
      <Path d={ALUZA_BODY} fill={fills.body} />
      <Path d={ALUZA_SPARK} fill={fills.spark} fillRule="evenodd" />
    </Svg>
  );
}
