import React from "react";
import { TextInput } from "react-native";

export default function Input({ ...props }) {
  return (
    <TextInput
      {...props}
      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 shadow-sm"
      placeholderTextColor="#aaa"
    />
  );
}
