-- Preserva assinaturas, filtros e resultados. As leituras passam a respeitar RLS.
alter function public.inventory_activity_daily(text, integer) security invoker;
alter function public.inventory_dashboard(text) security invoker;
alter function public.inventory_turnover(text, integer) security invoker;
