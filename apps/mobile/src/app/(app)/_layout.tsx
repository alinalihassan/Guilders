import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import AppTabs from "@/components/app-tabs";
import { authClient } from "@/lib/auth-client";

export default function AppLayout() {
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && !session) {
			router.replace("/(auth)/sign-in");
		}
	}, [session, isPending]);

	if (isPending) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (!session) {
		return null;
	}

	return <AppTabs />;
}
