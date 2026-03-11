import { createEffect } from "solid-js";
import TabNav from "../../../components/TabNav";
import ErrorBar from "../../../components/ui/feedback/ErrorBar";
import LoadingBar from "../../../components/ui/feedback/LoadingBar";
import { InterfaceItem } from "../../../constants/table-defs";
import { useRecordQuery } from "../../../hooks/useRecords";

export default function NavigationLayout(props: { children?: any }) {
  const {data, loading, error} = useRecordQuery<InterfaceItem>('interfaces', {"route": {op: "starts", v: "/admin/navigation/"}})

  return <>
    <TabNav items={data}></TabNav> {/*//fix */}
    <ErrorBar error={error} prefix="Error:" />
    <LoadingBar loading={loading()} prefix="Procesando..." />
    {props.children}
  </>
}