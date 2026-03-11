import { store } from "../../app";
import RecordSkeletonLoader from "../../components/record/RecordSkeletonLoader";
import Button from "../../components/ui/Button";
import { modalStore } from "../../lib/modal-store";
import FieldsShow from "../../components/fields/RecordDetails";

export default async function openProfile(userId: string) {
  const tableIdentifier = "users";
  const tableName = store.getTable(tableIdentifier)?.name ?? "Usuario";

  const modalId = modalStore.openModal({
    title: tableName,
    children: () => <RecordSkeletonLoader tableIdentifier={tableIdentifier} />,
    footer: () => (
      <Button variant="secondary" onClick={() => modalStore.closeModal(modalId)}>
        Cerrar
      </Button>
    )
  });

  try {
    const record = (await store.query(tableIdentifier, { id: userId }))?.[0];
    if (!record) throw new Error("User not found");

    modalStore.updateModal(modalId, {
      children: () => (
        <FieldsShow record={record} tableIdentifier={tableIdentifier} />
      )
    });

  } catch (err) {
    console.error(err);
    modalStore.closeModal(modalId);
  }
}