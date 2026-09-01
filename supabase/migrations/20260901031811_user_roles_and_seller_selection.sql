alter type public.app_user_role rename value 'operador' to 'vendedor';
alter type public.app_user_role add value if not exists 'designer';

comment on type public.app_user_role is
  'Função do usuário no aplicativo: superadmin (Admin), vendedor ou designer. Vendedor e designer mantêm as permissões operacionais existentes.';
