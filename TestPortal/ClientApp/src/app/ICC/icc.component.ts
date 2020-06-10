import {Component} from '@angular/core';

@Component({
  selector: 'app-icc',
  templateUrl: './icc.component.html',
  styleUrls: ['./icc.component.css']
})
export class ICCComponent {
  public icc_code = "123456"

  public generateCode() {
    const intervaller = setInterval(() => {
      this.icc_code = String(Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000);
    }, 50)
    // TODO: Add API call
    setTimeout(() => {
      clearInterval(intervaller)
    }, 500)
  }

  public copyCodeToClipboard() {
    var textArea = document.createElement("textarea");
    textArea.value = this.icc_code;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      var successful = document.execCommand('copy');
    } catch (err) {
    }

    document.body.removeChild(textArea);
  }

  public ICIdKeyPress($event: KeyboardEvent, index) {
    if (index < 5) {
      document.querySelector("#icIdWrapper .form-control:nth-child(" + (index + 2) + ")").focus()
    } else {
      setTimeout(()=>{
        document.querySelector(".btn:last-child").focus()
      })
    }
  }

  public report() {
    var ICId = Array.from(document.querySelectorAll("#icIdWrapper .form-control")).map(el => el.value).join("")
    console.log(ICId);
    setTimeout(()=>{
      this.generateCode()
      Array.from(document.querySelectorAll("#icIdWrapper .form-control")).forEach(el=>{
        el.value = ""
      })
    }, 200)
  }
}
