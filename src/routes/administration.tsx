import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/components/tclean/admin';
import { businessQuery,pageHead } from '@/lib/business-query';
import { defaultConfig } from '@/lib/business';
export const Route=createFileRoute('/administration')({head:()=>pageHead(defaultConfig,'Administration TClean','Espace de gestion sécurisé de TClean.','/administration',true),component:AdminPage});
