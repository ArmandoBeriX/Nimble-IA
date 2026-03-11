import { createMemo, For, Show } from "solid-js";
import { MenuItem } from "../../constants/table-defs";
import { useRecordQuery } from "../../hooks/useRecords";
import Icon from "../../components/ui/icon/Icon";
import WithTooltip from "../../components/ui/tooltip/WithTooltip";

export default function AdminPage() {

  const { data: menuItems, loading, error } = useRecordQuery<MenuItem>(
    "menu_items",
    { 'interface_id.route': { op: 'starts', v: '/admin' } },
    { order: [['position', 'ASC']] },
    { interface_id: {}, parent_id: {} }
  );

  const menu = createMemo(() => menuItems[0]?.parent)
  return (
    <div class="min-h-screen bg-gray-50 p-8">

      {/* Header */}
      <div class="max-w-6xl mx-auto mb-10">
        <h1 class="text-3xl md:text-4xl font-bold text-gray-900">
          {menu()?.name}
        </h1>
        <p class="text-gray-500 mt-2">
          {menu()?.description}
        </p>
      </div>

      {/* Content */}
      <div class="max-w-6xl mx-auto">

        <Show when={!loading()} fallback={
          <div class="text-gray-500">Cargando módulos...</div>
        }>

          <Show when={!error()} fallback={
            <div class="text-red-500">Error cargando menú</div>
          }>

            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              <For each={menuItems}>
                {(item) => (
                  <WithTooltip tooltip={item.description}>
                    <a
                      href={item.interface?.route}
                      class="
                        group
                        flex items-center gap-4
                        p-4
                        rounded-xl
                        bg-white
                        border border-gray-200
                        hover:border-gray-300
                        hover:shadow-sm
                        transition-all
                      "
                    >

                      {/* Icon */}
                      <div class="
                        flex items-center justify-center
                        w-10 h-10
                        rounded-lg
                        bg-gray-100
                        text-gray-600
                        group-hover:bg-gray-200
                      ">
                        <Icon name={item.icon} size={18} />
                      </div>

                      {/* Text */}
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold text-gray-900">
                          {item.name}
                        </span>

                        <span class="text-xs text-gray-500 line-clamp-2">
                          {item.description}
                        </span>
                      </div>

                    </a>
                  </WithTooltip>
                )}
              </For>

            </div>

          </Show>

        </Show>

      </div>
    </div>
  );
}