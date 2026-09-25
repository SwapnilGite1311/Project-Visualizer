namespace Acme.Util;

public class Helper : BaseHelper, IGreeter
{
    public string Greet(string name)
    {
        return Format(name);
    }

    private string Format(string name) => "Hello " + name;
}

public class BaseHelper { }

public interface IGreeter
{
    string Greet(string name);
}
