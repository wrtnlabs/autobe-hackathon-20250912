import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Searches and retrieves a paginated list of designer users filtered by
 * optional email and name criteria, supporting sorting and pagination.
 *
 * Only non-deleted designers are included (deleted_at is null).
 *
 * @param props - Contains TPM authentication payload and request filtering
 *   parameters.
 * @param props.tpm - Authenticated TPM user making the request.
 * @param props.body - Filtering, sorting, pagination options for designers.
 * @returns Paginated summary of designers matching the search criteria.
 * @throws {Error} If Prisma query fails or invalid parameters are passed.
 */
export async function patchtaskManagementTpmTaskManagementDesigners(props: {
  tpm: {
    id: string & tags.Format<"uuid">;
    type: "tpm";
  };
  body: ITaskManagementDesigner.IRequest;
}): Promise<IPageITaskManagementDesigner.ISummary> {
  const { body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;
  const skip = page * limit;

  const where: {
    deleted_at: null;
    email?: {
      contains: string;
    };
    name?: {
      contains: string;
    };
  } = { deleted_at: null };

  if (body.email !== undefined && body.email !== null) {
    where.email = { contains: body.email };
  }
  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  const designers = await MyGlobal.prisma.task_management_designer.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      body.sort === "email" || body.sort === "name"
        ? { [body.sort]: body.order === "asc" ? "asc" : "desc" }
        : { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  const total = await MyGlobal.prisma.task_management_designer.count({ where });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: designers.map((designer) => ({
      id: designer.id as string & tags.Format<"uuid">,
      email: designer.email as string & tags.Format<"email">,
      name: designer.name,
    })),
  };
}
