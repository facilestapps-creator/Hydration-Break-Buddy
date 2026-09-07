import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AppConfig, BreakEntry, BreakInput, GetPaymentStatusParams, HealthStatus, Leaderboard, MagicLinkRequestInput, MagicLinkVerifyInput, OkResponse, PaymentCreateInput, PaymentCreateResponse, PaymentStatusResponse, Team, TeamInput, TeamJoinInput, UpdateEmailInput, UpdateTeamLogoInput, UpdateTeamLogoResponse, User, UserInput, UserStats } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetConfigUrl: () => string;
/**
 * @summary Get public app configuration
 */
export declare const getConfig: (options?: RequestInit) => Promise<AppConfig>;
export declare const getGetConfigQueryKey: () => readonly ["/api/config"];
export declare const getGetConfigQueryOptions: <TData = Awaited<ReturnType<typeof getConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getConfig>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetConfigQueryResult = NonNullable<Awaited<ReturnType<typeof getConfig>>>;
export type GetConfigQueryError = ErrorType<unknown>;
/**
 * @summary Get public app configuration
 */
export declare function useGetConfig<TData = Awaited<ReturnType<typeof getConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateUserUrl: () => string;
/**
 * @summary Create a new user
 */
export declare const createUser: (userInput: UserInput, options?: RequestInit) => Promise<User>;
export declare const getCreateUserMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<UserInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<UserInput>;
}, TContext>;
export type CreateUserMutationResult = NonNullable<Awaited<ReturnType<typeof createUser>>>;
export type CreateUserMutationBody = BodyType<UserInput>;
export type CreateUserMutationError = ErrorType<void>;
/**
* @summary Create a new user
*/
export declare const useCreateUser: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<UserInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<UserInput>;
}, TContext>;
export declare const getGetUserUrl: (userId: number) => string;
/**
 * @summary Get a user by ID
 */
export declare const getUser: (userId: number, options?: RequestInit) => Promise<User>;
export declare const getGetUserQueryKey: (userId: number) => readonly [`/api/users/${number}`];
export declare const getGetUserQueryOptions: <TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<void>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserQueryResult = NonNullable<Awaited<ReturnType<typeof getUser>>>;
export type GetUserQueryError = ErrorType<void>;
/**
 * @summary Get a user by ID
 */
export declare function useGetUser<TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<void>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetUserStatsUrl: (userId: number) => string;
/**
 * @summary Get user's break stats (today and this week)
 */
export declare const getUserStats: (userId: number, options?: RequestInit) => Promise<UserStats>;
export declare const getGetUserStatsQueryKey: (userId: number) => readonly [`/api/users/${number}/stats`];
export declare const getGetUserStatsQueryOptions: <TData = Awaited<ReturnType<typeof getUserStats>>, TError = ErrorType<void>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getUserStats>>>;
export type GetUserStatsQueryError = ErrorType<void>;
/**
 * @summary Get user's break stats (today and this week)
 */
export declare function useGetUserStats<TData = Awaited<ReturnType<typeof getUserStats>>, TError = ErrorType<void>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateTeamUrl: () => string;
/**
 * @summary Create a new team
 */
export declare const createTeam: (teamInput: TeamInput, options?: RequestInit) => Promise<Team>;
export declare const getCreateTeamMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTeam>>, TError, {
        data: BodyType<TeamInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTeam>>, TError, {
    data: BodyType<TeamInput>;
}, TContext>;
export type CreateTeamMutationResult = NonNullable<Awaited<ReturnType<typeof createTeam>>>;
export type CreateTeamMutationBody = BodyType<TeamInput>;
export type CreateTeamMutationError = ErrorType<void>;
/**
* @summary Create a new team
*/
export declare const useCreateTeam: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTeam>>, TError, {
        data: BodyType<TeamInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTeam>>, TError, {
    data: BodyType<TeamInput>;
}, TContext>;
export declare const getJoinTeamUrl: () => string;
/**
 * @summary Join a team using an invite code
 */
export declare const joinTeam: (teamJoinInput: TeamJoinInput, options?: RequestInit) => Promise<Team>;
export declare const getJoinTeamMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof joinTeam>>, TError, {
        data: BodyType<TeamJoinInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof joinTeam>>, TError, {
    data: BodyType<TeamJoinInput>;
}, TContext>;
export type JoinTeamMutationResult = NonNullable<Awaited<ReturnType<typeof joinTeam>>>;
export type JoinTeamMutationBody = BodyType<TeamJoinInput>;
export type JoinTeamMutationError = ErrorType<void>;
/**
* @summary Join a team using an invite code
*/
export declare const useJoinTeam: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof joinTeam>>, TError, {
        data: BodyType<TeamJoinInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof joinTeam>>, TError, {
    data: BodyType<TeamJoinInput>;
}, TContext>;
export declare const getGetTeamUrl: (teamId: number) => string;
/**
 * @summary Get team info
 */
export declare const getTeam: (teamId: number, options?: RequestInit) => Promise<Team>;
export declare const getGetTeamQueryKey: (teamId: number) => readonly [`/api/teams/${number}`];
export declare const getGetTeamQueryOptions: <TData = Awaited<ReturnType<typeof getTeam>>, TError = ErrorType<void>>(teamId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeam>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTeam>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTeamQueryResult = NonNullable<Awaited<ReturnType<typeof getTeam>>>;
export type GetTeamQueryError = ErrorType<void>;
/**
 * @summary Get team info
 */
export declare function useGetTeam<TData = Awaited<ReturnType<typeof getTeam>>, TError = ErrorType<void>>(teamId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeam>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getPatchTeamLogoUrl: (teamId: number) => string;
/**
 * @summary Update the team logo URL
 */
export declare const patchTeamLogo: (teamId: number, updateTeamLogoInput: UpdateTeamLogoInput, options?: RequestInit) => Promise<UpdateTeamLogoResponse>;
export declare const getPatchTeamLogoMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof patchTeamLogo>>, TError, {
        teamId: number;
        data: BodyType<UpdateTeamLogoInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof patchTeamLogo>>, TError, {
    teamId: number;
    data: BodyType<UpdateTeamLogoInput>;
}, TContext>;
export type PatchTeamLogoMutationResult = NonNullable<Awaited<ReturnType<typeof patchTeamLogo>>>;
export type PatchTeamLogoMutationBody = BodyType<UpdateTeamLogoInput>;
export type PatchTeamLogoMutationError = ErrorType<void>;
/**
* @summary Update the team logo URL
*/
export declare const usePatchTeamLogo: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof patchTeamLogo>>, TError, {
        teamId: number;
        data: BodyType<UpdateTeamLogoInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof patchTeamLogo>>, TError, {
    teamId: number;
    data: BodyType<UpdateTeamLogoInput>;
}, TContext>;
export declare const getGetTeamLeaderboardUrl: (teamId: number) => string;
/**
 * @summary Get weekly leaderboard for a team
 */
export declare const getTeamLeaderboard: (teamId: number, options?: RequestInit) => Promise<Leaderboard>;
export declare const getGetTeamLeaderboardQueryKey: (teamId: number) => readonly [`/api/teams/${number}/leaderboard`];
export declare const getGetTeamLeaderboardQueryOptions: <TData = Awaited<ReturnType<typeof getTeamLeaderboard>>, TError = ErrorType<void>>(teamId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeamLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTeamLeaderboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTeamLeaderboardQueryResult = NonNullable<Awaited<ReturnType<typeof getTeamLeaderboard>>>;
export type GetTeamLeaderboardQueryError = ErrorType<void>;
/**
 * @summary Get weekly leaderboard for a team
 */
export declare function useGetTeamLeaderboard<TData = Awaited<ReturnType<typeof getTeamLeaderboard>>, TError = ErrorType<void>>(teamId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeamLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePaymentUrl: () => string;
/**
 * @summary Create a Mercado Pago preference for team creation
 */
export declare const createPayment: (paymentCreateInput: PaymentCreateInput, options?: RequestInit) => Promise<PaymentCreateResponse>;
export declare const getCreatePaymentMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPayment>>, TError, {
        data: BodyType<PaymentCreateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPayment>>, TError, {
    data: BodyType<PaymentCreateInput>;
}, TContext>;
export type CreatePaymentMutationResult = NonNullable<Awaited<ReturnType<typeof createPayment>>>;
export type CreatePaymentMutationBody = BodyType<PaymentCreateInput>;
export type CreatePaymentMutationError = ErrorType<void>;
/**
* @summary Create a Mercado Pago preference for team creation
*/
export declare const useCreatePayment: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPayment>>, TError, {
        data: BodyType<PaymentCreateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPayment>>, TError, {
    data: BodyType<PaymentCreateInput>;
}, TContext>;
export declare const getGetPaymentStatusUrl: (token: string, params?: GetPaymentStatusParams) => string;
/**
 * @summary Poll payment status by token
 */
export declare const getPaymentStatus: (token: string, params?: GetPaymentStatusParams, options?: RequestInit) => Promise<PaymentStatusResponse>;
export declare const getGetPaymentStatusQueryKey: (token: string, params?: GetPaymentStatusParams) => readonly [`/api/payments/${string}/status`, ...GetPaymentStatusParams[]];
export declare const getGetPaymentStatusQueryOptions: <TData = Awaited<ReturnType<typeof getPaymentStatus>>, TError = ErrorType<void>>(token: string, params?: GetPaymentStatusParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPaymentStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPaymentStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPaymentStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getPaymentStatus>>>;
export type GetPaymentStatusQueryError = ErrorType<void>;
/**
 * @summary Poll payment status by token
 */
export declare function useGetPaymentStatus<TData = Awaited<ReturnType<typeof getPaymentStatus>>, TError = ErrorType<void>>(token: string, params?: GetPaymentStatusParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPaymentStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getLogBreakUrl: () => string;
/**
 * @summary Log a completed break
 */
export declare const logBreak: (breakInput: BreakInput, options?: RequestInit) => Promise<BreakEntry>;
export declare const getLogBreakMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logBreak>>, TError, {
        data: BodyType<BreakInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logBreak>>, TError, {
    data: BodyType<BreakInput>;
}, TContext>;
export type LogBreakMutationResult = NonNullable<Awaited<ReturnType<typeof logBreak>>>;
export type LogBreakMutationBody = BodyType<BreakInput>;
export type LogBreakMutationError = ErrorType<void>;
/**
* @summary Log a completed break
*/
export declare const useLogBreak: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logBreak>>, TError, {
        data: BodyType<BreakInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logBreak>>, TError, {
    data: BodyType<BreakInput>;
}, TContext>;
export declare const getUpdateUserEmailUrl: (userId: number) => string;
/**
 * @summary Set or update the recovery email for a user
 */
export declare const updateUserEmail: (userId: number, updateEmailInput: UpdateEmailInput, options?: RequestInit) => Promise<User>;
export declare const getUpdateUserEmailMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserEmail>>, TError, {
        userId: number;
        data: BodyType<UpdateEmailInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUserEmail>>, TError, {
    userId: number;
    data: BodyType<UpdateEmailInput>;
}, TContext>;
export type UpdateUserEmailMutationResult = NonNullable<Awaited<ReturnType<typeof updateUserEmail>>>;
export type UpdateUserEmailMutationBody = BodyType<UpdateEmailInput>;
export type UpdateUserEmailMutationError = ErrorType<void>;
/**
* @summary Set or update the recovery email for a user
*/
export declare const useUpdateUserEmail: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserEmail>>, TError, {
        userId: number;
        data: BodyType<UpdateEmailInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUserEmail>>, TError, {
    userId: number;
    data: BodyType<UpdateEmailInput>;
}, TContext>;
export declare const getRequestMagicLinkUrl: () => string;
/**
 * @summary Request a magic login link by email
 */
export declare const requestMagicLink: (magicLinkRequestInput: MagicLinkRequestInput, options?: RequestInit) => Promise<OkResponse>;
export declare const getRequestMagicLinkMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestMagicLink>>, TError, {
        data: BodyType<MagicLinkRequestInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof requestMagicLink>>, TError, {
    data: BodyType<MagicLinkRequestInput>;
}, TContext>;
export type RequestMagicLinkMutationResult = NonNullable<Awaited<ReturnType<typeof requestMagicLink>>>;
export type RequestMagicLinkMutationBody = BodyType<MagicLinkRequestInput>;
export type RequestMagicLinkMutationError = ErrorType<void>;
/**
* @summary Request a magic login link by email
*/
export declare const useRequestMagicLink: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestMagicLink>>, TError, {
        data: BodyType<MagicLinkRequestInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof requestMagicLink>>, TError, {
    data: BodyType<MagicLinkRequestInput>;
}, TContext>;
export declare const getVerifyMagicLinkUrl: () => string;
/**
 * @summary Verify a magic link token and start a session
 */
export declare const verifyMagicLink: (magicLinkVerifyInput: MagicLinkVerifyInput, options?: RequestInit) => Promise<User>;
export declare const getVerifyMagicLinkMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyMagicLink>>, TError, {
        data: BodyType<MagicLinkVerifyInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyMagicLink>>, TError, {
    data: BodyType<MagicLinkVerifyInput>;
}, TContext>;
export type VerifyMagicLinkMutationResult = NonNullable<Awaited<ReturnType<typeof verifyMagicLink>>>;
export type VerifyMagicLinkMutationBody = BodyType<MagicLinkVerifyInput>;
export type VerifyMagicLinkMutationError = ErrorType<void>;
/**
* @summary Verify a magic link token and start a session
*/
export declare const useVerifyMagicLink: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyMagicLink>>, TError, {
        data: BodyType<MagicLinkVerifyInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyMagicLink>>, TError, {
    data: BodyType<MagicLinkVerifyInput>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map