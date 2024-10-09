// @ts-check
import React, { useContext } from "react";
import { Button, StyleSheet, View } from "react-native";
import { useAuthContext } from "../context/AuthContext";

export default function SignIn() {
	const { signIn } = useAuthContext();

	return (
		<View style={styles.container}>
			{/* <Button onPress={signIn} title={"Sign in"} /> */}
			<Button
				title='Login!'
				onPress={() => {
					try {
						signIn();
					} catch (error) {
						console.error("Error during login:", error);
					}
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		backgroundColor: "#fff",
		flex: 1,
		justifyContent: "center",
	},
});
