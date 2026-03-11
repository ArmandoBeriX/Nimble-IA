import TableList from "../../../sections/TableList";

export default function NavigationPage() {

  return <>
    <h2 class="text-2xl font-black text-gray-900 p-2 ">
      Menús de navegación
    </h2>
    <hr />
    <TableList tableIdentifier="menu_items" order={[['position', 'ASC']]} includes={{interface_id: {}}} defaultColumns={['icon', 'name', 'description', "interface_id"]} />
  </>
}