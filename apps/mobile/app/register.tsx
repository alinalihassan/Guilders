import { Link, router } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { authClient } from "@/lib/auth-client";

export default function Register() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleRegister = async () => {
		if (!name || !email || !password) {
			setError("Please fill in all fields");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const { error: signUpError } = await authClient.signUp.email({
				email,
				password,
				name,
			});

			if (signUpError) {
				setError(signUpError.message || "Failed to create account");
			} else {
				router.replace("/(tabs)");
			}
		} catch (err) {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={styles.container}
		>
			<View style={styles.form}>
				<Text style={styles.title}>Create Account</Text>

				{error ? <Text style={styles.error}>{error}</Text> : null}

				<TextInput
					style={styles.input}
					placeholder="Name"
					value={name}
					onChangeText={setName}
					autoCapitalize="words"
					editable={!loading}
				/>

				<TextInput
					style={styles.input}
					placeholder="Email"
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
					keyboardType="email-address"
					editable={!loading}
				/>

				<TextInput
					style={styles.input}
					placeholder="Password"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
					editable={!loading}
				/>

				<TextInput
					style={styles.input}
					placeholder="Confirm Password"
					value={confirmPassword}
					onChangeText={setConfirmPassword}
					secureTextEntry
					editable={!loading}
				/>

				<TouchableOpacity
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={handleRegister}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Create Account</Text>
					)}
				</TouchableOpacity>

				<View style={styles.footer}>
					<Text style={styles.footerText}>Already have an account? </Text>
					<Link href="/sign-in" asChild>
						<TouchableOpacity>
							<Text style={styles.link}>Sign In</Text>
						</TouchableOpacity>
					</Link>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	form: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 24,
		gap: 16,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		marginBottom: 32,
		textAlign: "center",
	},
	input: {
		height: 48,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		paddingHorizontal: 16,
		fontSize: 16,
	},
	button: {
		height: 48,
		backgroundColor: "#007AFF",
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginTop: 8,
	},
	buttonDisabled: {
		backgroundColor: "#ccc",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	error: {
		color: "#ff3b30",
		textAlign: "center",
		marginBottom: 8,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 24,
	},
	footerText: {
		color: "#666",
	},
	link: {
		color: "#007AFF",
		fontWeight: "600",
	},
});
