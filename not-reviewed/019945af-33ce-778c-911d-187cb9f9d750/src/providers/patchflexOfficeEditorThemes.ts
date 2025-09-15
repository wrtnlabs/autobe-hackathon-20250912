import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { IPageIFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeTheme";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Search and paginate UI themes.
 *
 * This operation retrieves a filtered, sorted, and paginated list of UI/Page
 * Builder themes stored in FlexOffice. It supports optional filtering by theme
 * name and sorting by creation date. Only non-deleted themes (deleted_at is
 * null) are returned.
 *
 * @param props - Object containing the authenticated editor and search
 *   parameters
 * @param props.editor - The authenticated editor performing the request
 * @param props.body - The request body containing filtering and pagination
 *   options
 * @returns A paginated summary of UI themes matching the search criteria
 * @throws {Error} When Prisma database operation fails
 */
export async function patchflexOfficeEditorThemes(props: {
  editor: EditorPayload;
  body: IFlexOfficeTheme.IRequest;
}): Promise<IPageIFlexOfficeTheme.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: any = {
    deleted_at: null,
  };
  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  const orderBy = {
    created_at: (body.sortOrder ?? "desc") === "asc" ? "asc" : "desc",
  };

  const [themes, total] = await Promise.all([
    MyGlobal.prisma.flex_office_themes.findMany({
      skip,
      take: limit,
      where,
      orderBy,
      select: {
        id: true,
        name: true,
      },
    }),
    MyGlobal.prisma.flex_office_themes.count({ where }),
  ]);

  const data = themes.map((theme) => ({
    id: theme.id as string & tags.Format<"uuid">,
    name: theme.name,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
