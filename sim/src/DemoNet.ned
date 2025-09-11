simple Submitter
{
    parameters:
        double startAt @unit(s) = default(1s);
        double period  @unit(s) = default(3s);
        int    repeats          = default(3);
        int    score            = default(92);
        bool   reveal           = default(true);
        int    modelIdx         = default(2);
        int    fromIdx          = default(0);
}
network DemoNet
{
    submodules:
        a: Submitter { parameters: startAt = 1s; period = 3s; repeats = 3; score = 92; reveal = true;  modelIdx = 2; fromIdx = 0; }
        b: Submitter { parameters: startAt = 2s; period = 4s; repeats = 2; score = 55; reveal = false; modelIdx = 3; fromIdx = 1; }
}
