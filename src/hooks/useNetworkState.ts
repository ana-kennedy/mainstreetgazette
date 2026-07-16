import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  isSlowConnection: boolean;
}

const DEFAULT_STATE: NetworkState = {
  isConnected: true,
  isInternetReachable: null,
  connectionType: "unknown",
  isSlowConnection: false,
};

function fromNetInfo(state: NetInfoState): NetworkState {
  const isConnected = state.isConnected ?? true;
  const isInternetReachable = state.isInternetReachable ?? null;
  const connectionType = state.type;
  const cellularGen = (state.details as Record<string, unknown> | null)?.cellularGeneration;
  const isSlowConnection =
    !isConnected ||
    connectionType === "none" ||
    cellularGen === "2g";
  return { isConnected, isInternetReachable, connectionType, isSlowConnection };
}

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(DEFAULT_STATE);

  useEffect(() => {
    NetInfo.fetch().then((s) => setState(fromNetInfo(s))).catch(() => {});
    const unsubscribe = NetInfo.addEventListener((s) => setState(fromNetInfo(s)));
    return unsubscribe;
  }, []);

  return state;
}

export async function fetchNetworkState(): Promise<NetworkState> {
  const state = await NetInfo.fetch();
  return fromNetInfo(state);
}
