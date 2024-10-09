import { Stack, Redirect } from "expo-router";

import { useAuthContext } from "@/context/AuthContext";

export default function AppLayout() {
	const { state } = useAuthContext();
	console.log(state);
	if (!state.isSignedIn) return <Redirect href='/sign-in' />;

	return (
		<Stack>
			<Stack.Screen name='index' />
		</Stack>
	);
}
