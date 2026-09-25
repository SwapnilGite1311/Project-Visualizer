package com.acme.util;

public class Helper {
    public void greet(String name) {
        if (name != null) {
            System.out.println(format(name));
        }
    }

    private String format(String name) {
        return "Hello " + name;
    }

    public static String version() {
        return "1.0";
    }
}
