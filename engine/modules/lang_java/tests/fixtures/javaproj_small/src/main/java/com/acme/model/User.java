package com.acme.model;

import com.acme.core.Base;
import com.acme.core.Named;

public class User extends Base implements Named {
    public String name() {
        return "user";
    }
}
