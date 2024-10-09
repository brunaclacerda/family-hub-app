// @ts-check
import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useReducer,
} from "react";
import * as WebBrowser from "expo-web-browser";
import {
	makeRedirectUri,
	useAuthRequest,
	useAutoDiscovery,
} from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

const initialState = {
	isSignedIn: false,
	accessToken: null,
	idToken: null,
	userInfo: null,
};

const AuthContext = createContext({
	state: initialState,
	signIn: () => {},
	signOut: () => {},
});

export function AuthProvider({ children }) {
	// @ts-ignore
	const discovery = useAutoDiscovery(process.env.EXPO_PUBLIC_KEYCLOAK_URL);
	const redirectUri = makeRedirectUri({ path: "home" });
	console.log(redirectUri);
	const [request, response, promptAsync] = useAuthRequest(
		{
			// @ts-ignore
			clientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID,
			redirectUri: redirectUri,
			scopes: ["openid", "profile"],
		},
		discovery
	);

	const [authState, dispatch] = useReducer((previousState, action) => {
		switch (action.type) {
			case "SIGN_IN":
				return {
					...previousState,
					isSignedIn: true,
					accessToken: action.payload.access_token,
					idToken: action.payload.id_token,
				};
			case "USER_INFO":
				return {
					...previousState,
					userInfo: {
						username: action.payload.preferred_username,
						givenName: action.payload.given_name,
						familyName: action.payload.family_name,
						email: action.payload.email,
						roles: action.payload.roles,
					},
				};
			case "SIGN_OUT":
				return {
					initialState,
				};
		}
	}, initialState);

	const authContext = useMemo(
		() => ({
			state: authState,
			signIn: () => {
				console.log("signin");
				// promptAsync();
				try {
					promptAsync();
				} catch (error) {
					console.error("Error during login:", error);
				}
			},
			signOut: async () => {
				try {
					const idToken = authState.idToken;
					await fetch(
						`${process.env.EXPO_PUBLIC_KEYCLOAK_URL}/protocol/openid-connect/logout?id_token_hint=${idToken}`
					);
					// @ts-ignore
					dispatch({ type: "SIGN_OUT" });
				} catch (e) {
					console.warn(e);
				}
			},
		}),
		[authState, promptAsync]
	);

	/**
	 * Get access-token when authorization-code is available
	 */
	useEffect(() => {
		const getToken = async ({ code, codeVerifier, redirectUri }) => {
			try {
				const formData = {
					grant_type: "authorization_code",
					client_id: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID,
					code: code,
					code_verifier: codeVerifier,
					redirect_uri: redirectUri,
				};
				const formBody = [];
				for (const property in formData) {
					var encodedKey = encodeURIComponent(property);
					var encodedValue = encodeURIComponent(formData[property]);
					formBody.push(encodedKey + "=" + encodedValue);
				}

				const response = await fetch(
					`${process.env.EXPO_PUBLIC_KEYCLOAK_URL}/protocol/openid-connect/token`,
					{
						method: "POST",
						headers: {
							Accept: "application/json",
							"Content-Type": "application/x-www-form-urlencoded",
						},
						body: formBody.join("&"),
					}
				);
				if (response.ok) {
					const payload = await response.json();
					// @ts-ignore
					dispatch({ type: "SIGN_IN", payload });
				}
			} catch (e) {
				console.warn(e);
			}
		};
		if (response?.type === "success") {
			const { code } = response.params;
			getToken({
				code,
				codeVerifier: request?.codeVerifier,
				redirectUri,
			});
		} else if (response?.type === "error") {
			console.warn("Authentication error: ", response.error);
		}
	}, [dispatch, redirectUri, request?.codeVerifier, response]);

	/**
	 * Get user-info when signing in completed
	 */
	useEffect(() => {
		const getUserInfo = async () => {
			try {
				const accessToken = authState.accessToken;
				const response = await fetch(
					`${process.env.EXPO_PUBLIC_KEYCLOAK_URL}/protocol/openid-connect/userinfo`,
					{
						method: "GET",
						headers: {
							Authorization: "Bearer " + accessToken,
							Accept: "application/json",
						},
					}
				);
				if (response.ok) {
					const payload = await response.json();
					// @ts-ignore
					dispatch({ type: "USER_INFO", payload });
				}
			} catch (e) {
				console.warn(e);
			}
		};
		if (authState.isSignedIn) {
			getUserInfo();
		}
	}, [authState.accessToken, authState.isSignedIn, dispatch]);

	return (
		<AuthContext.Provider
			// @ts-ignore
			value={authContext}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuthContext() {
	return useContext(AuthContext);
}
