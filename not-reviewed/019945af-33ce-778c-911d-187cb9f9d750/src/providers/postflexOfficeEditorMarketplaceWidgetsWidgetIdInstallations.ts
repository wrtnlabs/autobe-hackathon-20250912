import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new installation of a marketplace widget on a FlexOffice UI page.
 *
 * This operation associates a marketplace widget identified by the given widget
 * ID with a specified UI page, including optional configuration details.
 *
 * Only authenticated editors with proper authorization can invoke this
 * operation.
 *
 * @param props - Object containing the editor payload, widgetId path parameter,
 *   and installation details.
 * @param props.editor - The authenticated editor performing the operation.
 * @param props.widgetId - The unique identifier of the marketplace widget to
 *   install.
 * @param props.body - Installation details including page association and
 *   configuration.
 * @returns The created widget installation record including timestamps and
 *   association IDs.
 * @throws {Error} Throws error if Prisma create operation fails or data is
 *   invalid.
 */
export async function postflexOfficeEditorMarketplaceWidgetsWidgetIdInstallations(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidgetInstallation.ICreate;
}): Promise<IFlexOfficeWidgetInstallation> {
  const { editor, widgetId, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_widget_installations.create(
    {
      data: {
        id,
        marketplace_widget_id: widgetId,
        page_id: body.page_id,
        installation_date: body.installation_date,
        configuration_data: body.configuration_data ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    marketplace_widget_id: created.marketplace_widget_id,
    page_id: created.page_id,
    installation_date: created.installation_date,
    configuration_data: created.configuration_data ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
