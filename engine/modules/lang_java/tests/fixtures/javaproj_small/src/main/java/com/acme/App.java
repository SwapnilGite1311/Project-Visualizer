package com.acme;

import com.acme.util.Helper;
import com.acme.model.*;
import java.util.List;

public class App {
    public static void main(String[] args) {
        Helper helper = new Helper();
        helper.greet("world");
        System.out.println(Helper.version());
    }
}
