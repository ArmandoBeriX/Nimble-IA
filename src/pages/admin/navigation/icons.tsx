import TableList from "../../../sections/TableList";

export default function NavigationPage() {

  return <>
    <h2 class="text-2xl font-black text-gray-900 p-2 ">
      Íconos
    </h2>
    <hr />
    <TableList tableIdentifier="icons" defaultColumns={['id', 'description', 'fill', 'stroke']} order={[['name', 'ASC']]} />
  </>
}