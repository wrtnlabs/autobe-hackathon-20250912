import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { IPageITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoard";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * List boards under a specific project
 *
 * Retrieves a paginated list of boards belonging to the specified projectId.
 * Supports filtering by name and owner_id, pagination, and sorting by name or
 * creation date. Only boards not soft deleted (deleted_at is null) are
 * returned.
 *
 * @param props - Object containing the authenticated TPM payload, projectId
 *   path parameter, and filtering/pagination body
 * @param props.tpm - Authenticated TPM user payload
 * @param props.projectId - UUID of the project to list boards for
 * @param props.body - Filtering and pagination parameters conforming to
 *   ITaskManagementBoard.IRequest
 * @returns Paginated board summaries conforming to
 *   IPageITaskManagementBoard.ISummary
 * @throws {Error} Throws if database operations fail
 */
export async function patchtaskManagementTpmProjectsProjectIdBoards(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementBoard.IRequest;
}): Promise<IPageITaskManagementBoard.ISummary> {
  const { tpm, projectId, body } = props;

  // Set default page and limit if not provided
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  // Calculate skip
  const skip = (page - 1) * limit;

  // Build where filter
  const where = {
    project_id: projectId,
    deleted_at: null,
    ...(body.name !== undefined && body.name !== null
      ? { name: { contains: body.name } }
      : {}),
    ...(body.owner_id !== undefined && body.owner_id !== null
      ? { owner_id: body.owner_id }
      : {}),
  };

  // Allowed sort fields
  const allowedSortFields = ["name", "created_at"];
  const sortBy = allowedSortFields.includes(body.sortBy ?? "")
    ? body.sortBy!
    : "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // Fetch total count and page data
  const [total, boards] = await Promise.all([
    MyGlobal.prisma.task_management_boards.count({ where }),
    MyGlobal.prisma.task_management_boards.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
      select: {
        id: true,
        project_id: true,
        code: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  // Return pagination and mapped data
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: boards.map((board) => ({
      id: board.id as string & tags.Format<"uuid">,
      project_id: board.project_id as string & tags.Format<"uuid">,
      code: board.code,
      name: board.name,
      created_at: toISOStringSafe(board.created_at),
      updated_at: toISOStringSafe(board.updated_at),
    })),
  };
}
