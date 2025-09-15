export namespace ISpecialtyCoffeeLogGuestRefreshToken {
  /** Refresh token request payload containing the refresh token string. */
  export type IRequest = {
    /** The refresh token string issued to the guest user. */
    refresh_token: string;
  };
}
