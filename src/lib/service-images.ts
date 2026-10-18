import canapeTissu from '@/assets/service-canape-tissu.jpg';
import canapeAngle from '@/assets/service-canape-angle.jpg';
import fauteuil from '@/assets/service-fauteuil.jpg';
import matelas from '@/assets/service-matelas.jpg';
import chaises from '@/assets/service-chaises.jpg';
import pouf from '@/assets/service-pouf.jpg';
import convertible from '@/assets/service-canape-convertible.jpg';
import coussins from '@/assets/service-coussins.jpg';
import care from '@/assets/tclean-nettoyage.jpg';

const images: Record<string, string> = { 'canape-tissu': canapeTissu, 'canape-angle': canapeAngle, fauteuil, matelas, chaises, pouf, 'canape-convertible': convertible, coussins };
export const serviceImage = (slug: string) => images[slug] ?? care;
