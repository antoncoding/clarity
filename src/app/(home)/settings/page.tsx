"use client";

import { useState, useEffect } from "react";
import { convertToChineseSetting } from "@/utils/ui/chinese";
import storage from 'local-storage-fallback'


export default function SettingsPage() {
  const [chineseCharacterSetting, setChineseCharacterSetting] = useState<string>("traditional");
  
  // Load settings from local storage on component mount
  useEffect(() => {
    const savedSetting = storage.getItem("chineseCharacterSetting");
    if (savedSetting) {
      setChineseCharacterSetting(savedSetting);
    }
  }, []);
  
  // Handle setting change
  const handleChineseSettingChange = (value: string) => {
    setChineseCharacterSetting(value);
    storage.setItem("chineseCharacterSetting", value);
  };
  
  // Sample text to demonstrate the conversion
  const sampleText = "中文文本示例，简体中文和繁体中文。";
  const convertedSample = convertToChineseSetting(sampleText);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Display Settings</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Chinese Character Display</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Choose how Chinese characters should be displayed throughout the application.
          </p>
          
          <div className="flex flex-col space-y-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="chineseCharacterSetting"
                value="traditional"
                checked={chineseCharacterSetting === "traditional"}
                onChange={() => handleChineseSettingChange("traditional")}
              />
              <span className="ml-2">Traditional Chinese (繁體中文)</span>
            </label>
            
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="chineseCharacterSetting"
                value="simplified"
                checked={chineseCharacterSetting === "simplified"}
                onChange={() => handleChineseSettingChange("simplified")}
              />
              <span className="ml-2">Simplified Chinese (简体中文)</span>
            </label>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
          <h4 className="font-medium mb-2">Preview:</h4>
          <p>{convertedSample}</p>
        </div>
      </div>
    </div>
  );
} 