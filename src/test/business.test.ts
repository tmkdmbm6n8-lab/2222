import {describe,it,expect} from 'vitest';
import {defaultConfig,telephone,estimate,checkArea} from '@/lib/business';
import {requestSchema,configSchema} from '@/lib/business-schema';
import {defaultConfiguration,priceConfiguration,chairLotPrice,serviceFurniture,forType} from '@/lib/configurator';
describe('TClean official business rules',()=>{
 it('leaves decorative and removable cushions opt-in',()=>{expect(defaultConfiguration.decorative).toBe(false);expect(defaultConfiguration.removable).toBe(false);expect(forType(defaultConfiguration,'armchair').removable).toBe(false);});
 it.each([['fauteuil','armchair'],['pouf','pouf'],['coussins','cushion'],['matelas','mattress1'],['chaises','chair'],['canape-angle','angleLeft'],['canape-convertible','convertible'],['canape-tissu','sofa2']])('preselects %s as %s',(slug,type)=>expect(serviceFurniture(slug)).toBe(type));
 it('uses the correct phone link',()=>expect(telephone(defaultConfig)).toBe('+33677695079'));
 it('prices the 3-seat sofa at 69 with free travel',()=>expect(priceConfiguration(defaultConfig,defaultConfiguration).total).toBe(69));
 it('charges 9 travel under 30 TTC',()=>{
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'armchair',decorative:false}).total).toBe(38);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'armchair',decorative:false,pouf:true}).total).toBe(44);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'chair',decorative:false}).total).toBe(17);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'mattress1',decorative:false}).total).toBe(38);
 });
 it('prices mattresses by size and faces',()=>{
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'mattress1',faces:'two'}).total).toBe(39);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'mattress2'}).total).toBe(49);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'mattress2',faces:'two'}).total).toBe(69);
 });
 it('prices sofas by seats and shape',()=>{
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'sofa2',seatCushions:2,backCushions:2,decorative:false}).total).toBe(59);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'sofa4',seatCushions:5,backCushions:5,decorative:false}).total).toBe(89);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'angleLeft',decorative:false}).total).toBe(89);
  expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'panoramic',decorative:false}).total).toBe(99);
 });
 it('adds decorative cushions at 5 each only when opted in',()=>{expect(priceConfiguration(defaultConfig,{...defaultConfiguration,backCushions:5,decorative:true}).total).toBe(79);expect(priceConfiguration(defaultConfig,{...defaultConfiguration,backCushions:5}).total).toBe(69);});
 it('prices chair lots',()=>{
  const p=defaultConfig.configuratorPrices;
  expect(chairLotPrice(p,1)).toBe(8);expect(chairLotPrice(p,4)).toBe(29);expect(chairLotPrice(p,6)).toBe(39);expect(chairLotPrice(p,8)).toBe(49);expect(chairLotPrice(p,9)).toBe(57);
 });
 it('uses the complete order subtotal for free travel',()=>expect(priceConfiguration(defaultConfig,{...defaultConfiguration,type:'armchair',decorative:false,pouf:true}).travelFee).toBe(0));
 it('recognizes Strasbourg without claiming Sélestat',()=>{expect(checkArea(defaultConfig,'67000')[0]?.name).toBe('Strasbourg');expect(checkArea(defaultConfig,'67600')).toEqual([])});
 it('rejects expanding beyond 50km',()=>expect(configSchema.safeParse({...defaultConfig,radius:51}).success).toBe(false));
 it('rejects missing client data',()=>expect(requestSchema.safeParse({kind:'quote'}).success).toBe(false));
 it.each([[29,38],[30,30],[59,59]])('charges travel only below 30 TTC for %s', (price,total)=>{const c={...defaultConfig,services:defaultConfig.services.map(s=>({...s,price}))};expect(estimate(c,'canape-tissu',1)).toBe(total);});
});
