#include <omnetpp.h>
#include <curl/curl.h>
#include <string>
#include <sstream>
#include <cctype>
using namespace omnetpp;

static size_t writeCb(char* ptr, size_t size, size_t nmemb, void* userdata) {
    auto* buf = static_cast<std::string*>(userdata);
    buf->append(ptr, size * nmemb);
    return size * nmemb;
}

class Submitter : public cSimpleModule {
  private:
    cMessage* go = nullptr;
    simtime_t startAt, period;
    int repeats = 0, left = 0;
    int score = 0; bool reveal = true; int modelIdx = 0; int fromIdx = 0;
    int sent = 0, ok = 0;
    cOutVector vecSent, vecSuccessRate, vecGasUsed;

  protected:
    virtual void initialize() override {
        startAt = par("startAt");
        period  = par("period");
        repeats = par("repeats");
        left    = repeats;
        score   = par("score");
        reveal  = par("reveal");
        modelIdx= par("modelIdx");
        fromIdx = par("fromIdx");

        vecSent.setName(("sent:" + std::string(getFullPath())).c_str());
        vecSuccessRate.setName(("successRate:" + std::string(getFullPath())).c_str());
        vecGasUsed.setName(("gasUsed:" + std::string(getFullPath())).c_str());

        go = new cMessage("go");
        scheduleAt(startAt, go);
    }

    virtual void handleMessage(cMessage* msg) override {
        ASSERT(msg == go);
        sendOnce();
        left--;
        if (left > 0) scheduleAt(simTime() + period, go);
        else { delete go; go = nullptr; }
    }

    void sendOnce() {
        sent++;

        std::ostringstream js;
        js << "{\"score\":" << score
           << ",\"reveal\":" << (reveal? "true":"false")
           << ",\"modelIdx\":" << modelIdx
           << ",\"fromIdx\":" << fromIdx << "}";

        std::string payload = js.str();
        std::string resp;
        long httpCode = 0;

        CURL* curl = curl_easy_init();
        if (!curl) { EV_WARN << "curl init failed\n"; recordAfter(false, -1); return; }

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_URL, "http://127.0.0.1:4000/submit");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)payload.size());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCb);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &resp);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        CURLcode res = curl_easy_perform(curl);
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);

        bool okFlag = (res == CURLE_OK && httpCode == 200 && resp.find("\"ok\":true") != std::string::npos);
        long long gas = parseGasUsed(resp);
        if (okFlag) ok++;
        else EV_WARN << "HTTP " << httpCode << " curl=" << res << " resp=" << resp << "\n";

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        recordAfter(okFlag, gas);
    }

    static long long parseGasUsed(const std::string& s) {
        auto pos = s.find("\"gasUsed\":");
        if (pos == std::string::npos) return -1;
        pos += 10;
        while (pos < (int)s.size() && (s[pos] == ' ' || s[pos] == '\"')) pos++;
        long long val = 0; bool has = false;
        while (pos < (int)s.size() && std::isdigit((unsigned char)s[pos])) {
            has = true; val = val*10 + (s[pos]-'0'); pos++;
        }
        return has ? val : -1;
    }

    void recordAfter(bool /*okFlag*/, long long gas) {
        double successRate = (sent > 0) ? ((double)ok / sent) : 0.0;
        vecSent.record(sent);
        vecSuccessRate.record(successRate);
        if (gas >= 0) vecGasUsed.record((double)gas);
    }

    virtual void finish() override {
        recordScalar("sentTotal", sent);
        recordScalar("okTotal", ok);
        recordScalar("successRateFinal", (sent>0)? ((double)ok/sent) : 0.0);
    }
};

Define_Module(Submitter);
