import TableList from "../../sections/TableList";

export default function UsersPage() {

  return <>
    <h2 class="text-2xl font-black text-gray-900 p-2 ">
      Gestión de Usuarios
    </h2>
    <hr />
    <TableList tableIdentifier="users" defaultColumns={['firstname', 'lastname', 'email', 'status']} />
  </>
}