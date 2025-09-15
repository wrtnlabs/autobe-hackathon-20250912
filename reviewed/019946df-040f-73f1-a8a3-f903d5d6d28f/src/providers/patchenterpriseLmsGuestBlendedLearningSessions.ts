import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Retrieves a filtered and paginated list of blended learning sessions
 * available to the guest user.
 *
 * This operation enforces tenant-based data isolation, only returning sessions
 * related to the tenant of the authenticated guest. Filters include session
 * type, status, scheduled start and end date ranges, plus pagination and
 * sorting.
 *
 * @param props - Object containing guest authentication info and request filter
 *   body
 * @param props.guest - Authenticated guest user payload
 * @param props.body - Filter and pagination criteria for blended learning
 *   sessions
 * @returns Paginated list of blended learning session summaries conforming to
 *   API structure
 * @throws Error when guest is not found, inactive, or deleted
 */
export async function patchenterpriseLmsGuestBlendedLearningSessions(props: {
  guest: GuestPayload;
  body: IEnterpriseLmsBlendedLearningSession.IRequest;
}): Promise<IPageIEnterpriseLmsBlendedLearningSession.ISummary> {
  const { guest, body } = props;

  // Fetch guest record to get tenant_id and validate status
  const guestRecord = await MyGlobal.prisma.enterprise_lms_guest.findUnique({
    where: { id: guest.id },
    select: { tenant_id: true, status: true, deleted_at: true },
  });

  if (
    !guestRecord ||
    guestRecord.status !== "active" ||
    guestRecord.deleted_at !== null
  ) {
    throw new Error("Unauthorized: Guest not active or not found");
  }

  // Build filtering conditions
  const where: Record<string, unknown> = {
    tenant_id: guestRecord.tenant_id,
    deleted_at: null,
  };

  if (body.session_type !== undefined && body.session_type !== null) {
    where.session_type = body.session_type;
  }

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (
    (body.scheduled_start_at_from !== undefined &&
      body.scheduled_start_at_from !== null) ||
    (body.scheduled_start_at_to !== undefined &&
      body.scheduled_start_at_to !== null)
  ) {
    where.scheduled_start_at = {};
    if (
      body.scheduled_start_at_from !== undefined &&
      body.scheduled_start_at_from !== null
    ) {
      where.scheduled_start_at = {
        ...where.scheduled_start_at,
        gte: body.scheduled_start_at_from,
      };
    }
    if (
      body.scheduled_start_at_to !== undefined &&
      body.scheduled_start_at_to !== null
    ) {
      where.scheduled_start_at = {
        ...where.scheduled_start_at,
        lte: body.scheduled_start_at_to,
      };
    }
  }

  if (
    (body.scheduled_end_at_from !== undefined &&
      body.scheduled_end_at_from !== null) ||
    (body.scheduled_end_at_to !== undefined &&
      body.scheduled_end_at_to !== null)
  ) {
    where.scheduled_end_at = {};
    if (
      body.scheduled_end_at_from !== undefined &&
      body.scheduled_end_at_from !== null
    ) {
      where.scheduled_end_at = {
        ...where.scheduled_end_at,
        gte: body.scheduled_end_at_from,
      };
    }
    if (
      body.scheduled_end_at_to !== undefined &&
      body.scheduled_end_at_to !== null
    ) {
      where.scheduled_end_at = {
        ...where.scheduled_end_at,
        lte: body.scheduled_end_at_to,
      };
    }
  }

  // Pagination parameters
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 10;
  const skip = (page - 1) * limit;

  // Sorting logic
  const allowedOrderFields = [
    "scheduled_start_at",
    "created_at",
    "updated_at",
    "title",
    "status",
    "session_type",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { scheduled_start_at: "desc" };
  if (body.order_by && allowedOrderFields.includes(body.order_by)) {
    orderBy = { [body.order_by]: "asc" };
  }

  // Query database concurrently for count and list
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        scheduled_start_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_blended_learning_sessions.count({ where }),
  ]);

  // Map to ISummary with proper date conversions
  const data = sessions.map((session) => ({
    id: session.id,
    title: session.title,
    status: session.status,
    scheduled_start_at: toISOStringSafe(session.scheduled_start_at),
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
